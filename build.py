#!/usr/bin/env python3
"""Arma el juego a partir de src/.

Uso:  python3 build.py 1.19

Genera:
  index.html              la página de GitHub Pages (con metadatos para compartir)
  build/tejo-claude.html  la versión que se publica como artifact en Claude
  build/juego.js          todo el JavaScript junto, para revisarlo con `node --check`
"""
import base64
import pathlib
import sys

if len(sys.argv) != 2:
    sys.exit('Uso: python3 build.py <versión>   (por ejemplo: python3 build.py 1.19)')

VERSION = sys.argv[1]
ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / 'src'
OUT = ROOT / 'build'
OUT.mkdir(exist_ok=True)

BASE = 'https://jaten95.github.io/Tejo-cosmo/'
TITLE = 'Tejo: Club El Cosmo'
DESC = ('El deporte nacional en tu celular: revienta la mecha, embocina y gánale a tus amigos. '
        'Contra Don Chepe, en salas en línea o en el reto de 10 tejos.')
OG_ALT = 'Cancha de tejo con el bocín, las mechas y tres tejos clavados en la greda, junto al título TEJO del Club El Cosmo'

# Los archivos de src/js se concatenan en orden por su número: cada uno usa lo que definen los anteriores.
js = ''.join(p.read_text() for p in sorted((SRC / 'js').glob('*.js')))
(OUT / 'juego.js').write_text(js)

hand = base64.b64encode((SRC / 'assets' / 'mano-derecha.glb').read_bytes()).decode()
license_note = (ROOT / 'LICENSES' / 'webxr-input-profiles-hand.md').read_text().replace('*/', '')

body = (SRC / 'body.html').read_text().replace('{{VERSION}}', VERSION)
page = (
    (SRC / 'head.html').read_text() + body
    + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
    + '\n<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>'
    + '\n<script>\nconst GAME_VERSION = "' + VERSION + '";\n'
    + '/* ' + license_note + ' */\n'
    + 'const HAND_GLB = "' + hand + '";\n'
    + js + '\n</script>\n'
)
(OUT / 'tejo-claude.html').write_text(page)

pages_head = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#16110c">
<link rel="canonical" href="{BASE}">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_CO">
<meta property="og:site_name" content="Club de Tejo El Cosmo">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{BASE}">
<meta property="og:image" content="{BASE}og.jpg">
<meta property="og:image:secure_url" content="{BASE}og.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{OG_ALT}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{TITLE}">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="{BASE}og.jpg">
<style>[hidden]{{display:none!important}}body{{margin:0}}img{{max-width:100%}}</style>
</head>
<body>
'''
(ROOT / 'index.html').write_text(pages_head + page + '</body>\n</html>\n')
print(f'v{VERSION}: index.html y build/tejo-claude.html listos')
