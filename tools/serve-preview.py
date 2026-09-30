"""Serve the BELRE3 preview locally or on a selected private network address."""

import argparse
from functools import partial
import hashlib
import hmac
from http.cookies import CookieError, SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from ipaddress import ip_address, ip_network
from pathlib import Path
import re
import threading
import time
from urllib.parse import unquote, urlsplit


ACCESS_PAGE = """<!doctype html><html lang="nl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>BELRE3 preview openen</title>
<style>body{font:17px/1.5 Arial,sans-serif;background:#f5f6f8;color:#29313c;margin:0;padding:24px}
main{max-width:480px;margin:8vh auto;padding:28px;background:white;border:1px solid #ddd}
h1{font-size:24px}input,button{box-sizing:border-box;width:100%;padding:12px;font:inherit;margin:8px 0}
button{border:0;background:#008563;color:white;cursor:pointer}label{display:block}</style>
<main><h1>BELRE3 preview</h1><p id="status" role="status">Open de volledige uitnodigingslink of vul de toegangssleutel in.</p>
<form><label for="key">Toegangssleutel</label><input id="key" type="password" required autocomplete="off">
<button>Preview openen</button></form></main>
<script>
const form=document.querySelector('form'), input=document.querySelector('input'), status=document.querySelector('#status');
async function unlock(key){
  status.textContent='De preview wordt geopend…';
  try{
    const response=await fetch('/__preview/login',{method:'POST',headers:{'Content-Type':'text/plain'},body:key});
    if(!response.ok)throw new Error();
    location.replace('/oefenen/#start');
  }catch(error){status.textContent='De toegangssleutel klopt niet of de preview is verlopen.';}
}
form.addEventListener('submit',event=>{event.preventDefault();unlock(input.value.trim());});
const access=new URLSearchParams(location.hash.slice(1)).get('access');
if(access){history.replaceState(null,'',location.pathname);unlock(access);}
</script></html>""".encode("utf-8")


class PreviewHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
    }

    def __init__(self, *args, root, allowed_network, access_key=None, expires_at=None, **kwargs):
        self.root = root
        self.allowed_network = allowed_network
        self.access_key = access_key
        self.expires_at = expires_at
        self.session_key = (
            hmac.new(access_key, b"belre3-preview-session", hashlib.sha256).hexdigest()
            if access_key else None
        )
        super().__init__(*args, directory=str(root), **kwargs)

    def has_access(self):
        if not self.access_key:
            return True
        try:
            cookies = SimpleCookie(self.headers.get("Cookie", ""))
            cookie = cookies.get("__Host-belre3-preview")
            value = cookie.value if cookie else ""
            return hmac.compare_digest(value.encode("utf-8"), self.session_key.encode("ascii"))
        except (CookieError, UnicodeError):
            return False

    def allowed_client(self):
        if ip_address(self.client_address[0]) not in self.allowed_network:
            self.send_error(403)
            return False
        if self.expires_at is not None and time.monotonic() >= self.expires_at:
            self.send_error(410, "De tijdelijke preview is verlopen.")
            return False
        return True

    def do_POST(self):
        if not self.allowed_client():
            return
        if not self.access_key or urlsplit(self.path).path != "/__preview/login":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= 256:
            self.send_error(400)
            return
        self.connection.settimeout(10)
        supplied = self.rfile.read(length).strip()
        if not hmac.compare_digest(supplied, self.access_key):
            self.send_error(401, "Ongeldige toegangssleutel.")
            return
        remaining = max(1, int(self.expires_at - time.monotonic()))
        self.send_response(204)
        self.send_header("Set-Cookie", (
            f"__Host-belre3-preview={self.session_key}; Path=/; Secure; HttpOnly; "
            f"SameSite=Strict; Max-Age={remaining}"
        ))
        self.send_header("Content-Length", "0")
        self.end_headers()

    def send_head(self):
        if not self.allowed_client():
            return None

        requested = unquote(urlsplit(self.path).path)
        if not self.has_access():
            if requested in ("/", "/oefenen/", "/oefenen/index.html"):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(ACCESS_PAGE)))
                self.send_header("Content-Security-Policy", (
                    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
                    "connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
                ))
                self.end_headers()
                if self.command != "HEAD":
                    self.wfile.write(ACCESS_PAGE)
            else:
                self.send_error(401, "Toegangssleutel nodig.")
            return None
        if requested == "/":
            self.send_response(302)
            self.send_header("Location", "/oefenen/#start")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        parts = requested.lstrip("/").split("/")
        if "\\" in requested or ":" in requested or any(
            part.startswith(".") for part in parts
        ):
            self.send_error(404)
            return None

        # Expose only application files, never Git, tools, docs or local output.
        allowed = requested == "/index.html" or requested.startswith(
            ("/oefenen/", "/js/")
        )
        target = (self.root / requested.lstrip("/")).resolve()
        inside_app = target == self.root / "index.html" or any(
            target.is_relative_to(self.root / name) for name in ("oefenen", "js")
        )
        if not allowed or not inside_app:
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Robots-Tag", "noindex, nofollow, noarchive")
        self.send_header("Referrer-Policy", "no-referrer")
        if self.access_key:
            self.send_header("Cache-Control", "private, no-store, max-age=0")
        super().end_headers()

    def log_message(self, format, *args):
        # Avoid storing visitors' addresses or document names in preview logs.
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8768)
    parser.add_argument("--allow-network", default="127.0.0.0/8")
    parser.add_argument("--access-key-file", type=Path)
    parser.add_argument("--expires-in", type=int, default=10800)
    args = parser.parse_args()
    address = ip_address(args.bind)
    network = ip_network(args.allow_network)
    if address.version != 4 or not address.is_private or address.is_unspecified:
        parser.error("Use one specific local IPv4 address.")
    if address not in network or not network.is_private:
        parser.error("The allowed private network must contain the bind address.")
    access_key = None
    expires_at = None
    if args.access_key_file:
        if not address.is_loopback:
            parser.error("An authenticated HTTPS preview must bind to loopback.")
        access_key = args.access_key_file.read_bytes().strip()
        if not re.fullmatch(rb"[A-Za-z0-9_-]{32,128}", access_key):
            parser.error("Use a randomly generated URL-safe access key of at least 32 characters.")
        if not 60 <= args.expires_in <= 86400:
            parser.error("Choose a preview lifetime between 60 and 86400 seconds.")
        expires_at = time.monotonic() + args.expires_in
    root = args.root.resolve()
    if not (root / "oefenen" / "content" / "mc.json").is_file():
        parser.error("Import the course content before starting the preview.")
    handler = partial(
        PreviewHandler, root=root, allowed_network=network,
        access_key=access_key, expires_at=expires_at,
    )
    server = ThreadingHTTPServer((str(address), args.port), handler)
    if expires_at:
        expiry = threading.Timer(args.expires_in, server.shutdown)
        expiry.daemon = True
        expiry.start()
    print(f"BELRE3 preview: http://{address}:{server.server_port}/oefenen/#start", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
