from pathlib import Path
from html.parser import HTMLParser
import re
ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / 'index.html').read_text()
js = (ROOT / 'src/tree.js').read_text()
app = (ROOT / 'src/app.js').read_text()
css = (ROOT / 'styles.css').read_text()
class Parser(HTMLParser):
    def __init__(self): super().__init__();self.ids=set();self.importmap=False
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs: assert attrs['id'] not in self.ids, f'duplicate ID: {attrs["id"]}';self.ids.add(attrs['id'])
p=Parser();p.feed(html)
for token in ['viewer','generate','export-glb','bark-thumb','leaf-thumb','stat-tris','stat-leaves','loading']:
    assert token in p.ids, f'missing element: {token}'
for token in ['GLTFExporter','parseAsync','downloadBlob','generateTree','reset','exportPNG']:
    assert token in app, f'missing client action: {token}'
for token in ['appendTube','makeBarkTextures','makeLeafTextures','createLeafCard','stats.height','group.scale.setScalar']:
    assert token in js, f'missing generator logic: {token}'
assert 'Parkinsonia microphylla' in js
assert '0.174.0' in html
assert ':root' in css
assert all((ROOT / fp).exists() for fp in ['index.html','styles.css','src/tree.js','src/app.js','favicon.svg','.nojekyll','README.md'])
print(f'PASS static file checks; {len(p.ids)} unique HTML IDs')
