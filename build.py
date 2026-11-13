#!/usr/bin/env python3
"""Arma el juego a partir de src/.

Uso:  python3 build.py 1.43.0   (MAYOR.MENOR.PARCHE, ver «Versiones» en el README)

Genera:
  index.html              la página de GitHub Pages (con metadatos para compartir)
  build/tejo-claude.html  la versión que se publica como artifact en Claude
  build/juego.js          todo el JavaScript junto, para revisarlo con `node --check`
  sw.js                   el service worker de GitHub Pages (instalar y jugar sin internet)
  version.json            la versión publicada, para el aviso de actualizar
"""
import base64
import pathlib
import sys

if len(sys.argv) != 2:
    sys.exit('Uso: python3 build.py <versión>   (por ejemplo: python3 build.py 1.43.0)')

VERSION = sys.argv[1]
import re as _re
if not _re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', VERSION):
    sys.exit(f'La versión debe ser MAYOR.MENOR.PARCHE, por ejemplo 1.43.0 (llegó "{VERSION}"). Ver «Versiones» en el README.')
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
pets = ', '.join(f'{n}: "' + base64.b64encode((SRC / 'assets' / f'{n}.glb').read_bytes()).decode() + '"' for n in ('perro', 'husky'))
license_note = (ROOT / 'LICENSES' / 'webxr-input-profiles-hand.md').read_text().replace('*/', '')

body = (SRC / 'body.html').read_text().replace('{{VERSION}}', VERSION)
page = (
    (SRC / 'head.html').read_text() + body
    + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
    + '\n<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>'
    + '\n<script>\nconst GAME_VERSION = "' + VERSION + '";\n'
    + '/* ' + license_note + ' */\n'
    + 'const HAND_GLB = "' + hand + '";\n'
    + 'const PET_GLB = { ' + pets + ' };   /* Quaternius, CC0 */\n'
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
<link rel="manifest" href="manifest.webmanifest">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Tejo">
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
SW_REGISTER = ("<script>if ('serviceWorker' in navigator && !window.claude) addEventListener('load', () => "
               "navigator.serviceWorker.register('sw.js').catch(() => {}));</script>\n")
(ROOT / 'index.html').write_text(pages_head + page + SW_REGISTER + '</body>\n</html>\n')

# Service worker: la lista de lo que se guarda para jugar sin internet
import json, re
fonts = re.search(r'https://fonts\.googleapis\.com/css2[^"]+', (SRC / 'head.html').read_text()).group(0)
precache = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.png',
            'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', fonts.replace('&amp;', '&')]
sw = (SRC / 'sw.js').read_text().replace('{{VERSION}}', VERSION).replace('{{PRECACHE}}', json.dumps(precache, indent=2))
(ROOT / 'sw.js').write_text(sw)
(ROOT / 'version.json').write_text(json.dumps({'version': VERSION}) + '\n')   # la página lo consulta para avisar de versiones nuevas
print(f'v{VERSION}: index.html y build/tejo-claude.html listos')
