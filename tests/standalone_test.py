"""Ensure GitHub Pages index stays synchronized with the source."""
from pathlib import Path
import runpy
root=Path(__file__).resolve().parents[1]
index=root/'index.html'
before=index.read_bytes()
assert b'GLTFExporter' in before and b'makeLeafTextures' in before
assert b'src="./src/app.js"' not in before
assert b'GLB header validation failed' in before
runpy.run_path(str(root/'scripts/build.py'),run_name='__main__')
assert index.read_bytes()==before, 'Published index.html is stale; run python scripts/build.py and commit it.'
print('PASS reproducible GitHub Pages bundle ('+str(len(before))+' bytes)')
