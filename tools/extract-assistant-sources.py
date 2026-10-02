"""Build the assistant corpus only from the already approved publication PDFs."""
import hashlib
import json
import re
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'oefenen/content'


def build():
    manifest = json.loads((SOURCES / 'sources.json').read_text('utf-8'))
    ocr_path = ROOT / 'assistant/sources/ocr-pages.json'
    ocr = {(p['sourceId'], p['page']): p for p in json.loads(ocr_path.read_text('utf-8'))} if ocr_path.exists() else {}
    pages = []
    empty = []
    for source in manifest.values():
        pdf = SOURCES / source['url']
        if hashlib.sha256(pdf.read_bytes()).hexdigest() != source['sha256']:
            raise ValueError('Publicatiebron wijkt af: ' + source['id'])
        reader = PdfReader(pdf)
        if len(reader.pages) != source['pages']:
            raise ValueError('Paginatal wijkt af: ' + source['id'])
        for number, page in enumerate(reader.pages, 1):
            text = page.extract_text(extraction_mode='layout')
            supplement = ocr.get((source['id'], number))
            if supplement and not text.strip():
                if supplement['sha256'] != source['sha256']:
                    raise ValueError('OCR hoort bij een andere PDF: ' + source['id'])
                text = supplement['text']
            text = re.sub(r'[ \t]+', ' ', text)
            text = re.sub(r'\n\s*\n+', '\n\n', text).strip()
            # Download watermarks and private paths never enter the search corpus.
            text = re.sub(r'^.*(?:Downloaded by|Gedownload door|stuvia\.com|' + 'stud' + r'(?:ocu|eersnel)).*$','',text, flags=re.I | re.M)
            text = re.sub(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}', '[e-mailadres]', text, flags=re.I)
            text = re.sub(r'[A-Z]:[\\/]Users[\\/][^\s]+', '[lokaal pad]', text, flags=re.I)
            if not text.strip():
                empty.append({'sourceId': source['id'], 'page': number})
            pages.append({'sourceId': source['id'], 'page': number, 'text': text})
    corpus = {'version': 1, 'sources': manifest, 'pages': pages, 'emptyPages': empty}
    target = ROOT / 'assistant/sources/pages.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(corpus, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps({'documents': len(manifest), 'pages': len(pages), 'emptyPages': empty, 'bytes': target.stat().st_size}))
    missing = [s for s in manifest if not any(p['text'].strip() for p in pages if p['sourceId'] == s)]
    if missing:
        raise ValueError('Geen doorzoekbare tekst: ' + ', '.join(missing))


if __name__ == '__main__':
    build()
