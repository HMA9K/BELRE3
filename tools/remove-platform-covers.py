"""Remove verified distribution covers, preserving every content page and source ID.

Run on the publication copy. Original study documents stay outside this repository.
Requires PyMuPDF. Re-running on cleaned sources is a no-op.
"""
import hashlib
import json
import re
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'oefenen/content'
MARKER = re.compile('stud' + r'(?:ocu|eersnel)', re.I)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def clean():
    manifest_path = CONTENT / 'sources.json'
    sources = json.loads(manifest_path.read_text('utf-8'))
    changed = {}
    hashes = {}
    for source in sources.values():
        old_path = CONTENT / source['url']
        document = pymupdf.open(old_path)
        marked = [i for i, page in enumerate(document) if MARKER.search(page.get_text())]
        if not marked:
            document.close()
            continue
        # Fail closed: this migration only removes short advertising covers.
        if marked != [0] or len(document[0].get_text().split()) > 80 or len(document) < 2:
            raise ValueError('Handmatige beoordeling nodig: ' + source['id'])
        original = [(p.get_text(), digest(p.get_pixmap().samples)) for p in list(document)[1:]]
        document.delete_page(0)
        document.set_metadata({})
        document.del_xml_metadata()
        data = document.tobytes(garbage=4, deflate=True)
        document.close()
        check = pymupdf.open(stream=data, filetype='pdf')
        assert len(check) == len(original)
        for page, (text, pixels) in zip(check, original):
            assert page.get_text() == text, source['id']
            assert digest(page.get_pixmap().samples) == pixels, source['id']
            assert not MARKER.search(page.get_text()), source['id']
        check.close()
        sha = digest(data)
        new_url = 'pdf/' + sha + '.pdf'
        (CONTENT / new_url).write_bytes(data)
        hashes[source['sha256']] = sha
        changed[source['id']] = {'oldUrl': source['url'], 'newUrl': new_url, 'pages': len(original)}
        source.update(url=new_url, sha256=sha, pages=len(original))
        old_path.unlink()

    if not changed:
        print('Geen distributievoorbladen aanwezig.')
        return

    def remap(value):
        if isinstance(value, dict):
            source = changed.get(value.get('sourceId', value.get('id')))
            if source:
                for key in ('pdfPages',):
                    if key in value:
                        assert all(p > 1 for p in value[key]), 'Verwijzing naar reclamevoorblad'
                        value[key] = [p - 1 for p in value[key]]
                for key in ('page', 'pdfPage'):
                    if key in value:
                        assert value[key] > 1
                        value[key] -= 1
                for key in ('pages', 'pageCount'):
                    if key in value:
                        value[key] = source['pages']
                if 'url' in value:
                    value['url'] = source['newUrl']
            for key, item in list(value.items()):
                if isinstance(item, str) and item in hashes:
                    value[key] = hashes[item]
                else:
                    remap(item)
        elif isinstance(value, list):
            for item in value:
                remap(item)

    for path in ROOT.rglob('*.json'):
        if path == manifest_path or path == ROOT / 'assistant/sources/pages.json':
            continue
        if 'vendor' in path.parts or 'pdf-reader' in path.parts:
            continue
        before = path.read_text('utf-8')
        value = json.loads(before)
        snapshot = json.dumps(value, ensure_ascii=False)
        remap(value)
        if json.dumps(value, ensure_ascii=False) != snapshot:
            # Keep existing indentation for authored documents.
            indent = 2 if '\n  ' in before else None
            path.write_text(json.dumps(value, ensure_ascii=False, indent=indent,
                separators=None if indent else (',', ':')) + '\n', encoding='utf-8')
    manifest_path.write_text(json.dumps(sources, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps({'documents': len(changed), 'removedCovers': len(changed),
        'contentPagesPreserved': sum(c['pages'] for c in changed.values()),
        'validation': 'identical text and rendered pixels for every retained page'}))


if __name__ == '__main__':
    clean()
