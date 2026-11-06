"""Compile self-contained GitHub Pages index.html from editable sources."""
from pathlib import Path
from base64 import b64encode
import re
root=Path(__file__).resolve().parents[1]
html=(root/'modular.html').read_text(encoding='utf-8')
css=(root/'styles.css').read_text(encoding='utf-8').strip()
svg=(root/'favicon.svg').read_bytes()
tree=(root/'src/tree.js').read_text(encoding='utf-8')
app=(root/'src/app.js').read_text(encoding='utf-8')
assert tree.startswith('/*') and "import * as THREE from 'three';" in tree
assert app.startswith("import * as THREE from 'three';")
tree=tree.replace("import * as THREE from 'three';\n",'',1)
tree=re.sub(r'\bexport (?=(?:const|function|class) )','',tree)
app=app.replace("import * as THREE from 'three';\n",'',1)
app=app.replace("import { DEFAULTS, SPECIES, generateTree } from './tree.js';\n",'',1)
imports="""import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';"""
app=app.replace("import { OrbitControls } from 'three/addons/controls/OrbitControls.js';\n",'',1)
app=app.replace("import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';\n",'',1)
html=html.replace('<link rel="icon" href="favicon.svg" type="image/svg+xml" />', f'<link rel="icon" href="data:image/svg+xml;base64,{b64encode(svg).decode()}" type="image/svg+xml" />',1)
html=html.replace('<link rel="stylesheet" href="./styles.css" />','<style>\n'+css+'\n</style>',1)
html=html.replace('<script type="module" src="./src/app.js"></script>','<script type="module">\n'+imports+'\n'+tree+'\n'+app+'\n</script>',1)
assert 'src="./src/app.js"' not in html and html.count('<script type="module">')==1
(root/'index.html').write_text(html,encoding='utf-8')
print('Built index.html ('+str(len(html))+' chars)')
