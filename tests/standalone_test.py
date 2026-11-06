from pathlib import Path
p=Path(__file__).resolve().parents[1] / "standalone.html"
h=p.read_text()
assert h.count('<script type="module">')==1
assert "GLTFExporter" in h and "makeLeafTextures" in h
assert 'src="./src/app.js"' not in h
print("PASS single-file Github Pages website,", len(h), "characters")
