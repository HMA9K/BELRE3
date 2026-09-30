"""Check that a shared preview never serves course files without its access key."""

from functools import partial
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
import importlib.util
from ipaddress import ip_network
from pathlib import Path
import tempfile
import threading
import time
import unittest

spec = importlib.util.spec_from_file_location(
    "preview", Path(__file__).resolve().parent.parent / "tools" / "serve-preview.py"
)
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class PreviewAccessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name).resolve()
        (cls.root / "oefenen" / "content").mkdir(parents=True)
        (cls.root / "oefenen" / "index.html").write_text("course page")
        (cls.root / "oefenen" / "content" / "mc.json").write_text('["course data"]')
        (cls.root / "docs").mkdir()
        (cls.root / "docs" / "internal.txt").write_text("internal only")
        cls.handler = partial(
            preview.PreviewHandler, root=cls.root,
            allowed_network=ip_network("127.0.0.0/8"),
            access_key=b"test-key-" * 8, expires_at=time.monotonic() + 300,
        )
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), cls.handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temp.cleanup()

    def request(self, path, method="GET", body=None, cookie=None):
        headers = {"Cookie": cookie} if cookie else {}
        conn = HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        conn.request(method, path, body=body, headers=headers)
        response = conn.getresponse()
        result = (response.status, dict(response.getheaders()), response.read())
        conn.close()
        return result

    def login(self):
        status, headers, _ = self.request("/__preview/login", "POST", b"test-key-" * 8)
        self.assertEqual(status, 204)
        return headers["Set-Cookie"]

    def test_anonymous_visitors_only_get_the_access_page(self):
        status, headers, data = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn(b"Toegangssleutel", data)
        self.assertNotIn(b"course data", data)
        self.assertIn("no-store", headers["Cache-Control"])
        for path in ("/oefenen/content/mc.json", "/docs/internal.txt", "/.git"):
            self.assertEqual(self.request(path)[0], 401)

    def test_invalid_key_and_forged_cookie_are_rejected(self):
        self.assertEqual(self.request("/__preview/login", "POST", b"wrong-key")[0], 401)
        self.assertEqual(self.request("/oefenen/content/mc.json", cookie="__Host-belre3-preview=wrong")[0], 401)

    def test_authorized_files_require_a_secure_cookie_and_are_not_cached(self):
        cookie = self.login()
        for flag in ("Secure", "HttpOnly", "SameSite=Strict", "Path=/", "Max-Age="):
            self.assertIn(flag, cookie)
        status, headers, data = self.request("/oefenen/content/mc.json", cookie=cookie.split(";", 1)[0])
        self.assertEqual(status, 200)
        self.assertEqual(data, b'["course data"]')
        self.assertIn("private, no-store", headers["Cache-Control"])

    def test_authorized_visitors_still_cannot_read_internal_files_or_list_directories(self):
        cookie = self.login().split(";", 1)[0]
        for path in (
            "/docs/internal.txt", "/.git", "/tools/serve-preview.py", "/oefenen/content/",
            "/oefenen/%2e%2e/docs/internal.txt", "/oefenen/..%5cdocs/internal.txt",
            "/oefenen/content/mc.json:stream",
        ):
            self.assertEqual(self.request(path, cookie=cookie)[0], 404, path)

    def test_expired_preview_rejects_login_and_downloads(self):
        old = self.handler.keywords["expires_at"]
        self.handler.keywords["expires_at"] = time.monotonic() - 1
        try:
            self.assertEqual(self.request("/")[0], 410)
            self.assertEqual(self.request("/__preview/login", "POST", b"test-key-" * 8)[0], 410)
        finally:
            self.handler.keywords["expires_at"] = old


if __name__ == "__main__":
    unittest.main()
