# Tejo-cosmo

Tejo colombiano en 3D para el navegador, del Club de Tejo El Cosmo. Se juega contra Don Chepe, por turnos en el mismo celular, en salas en línea con amigos o en el reto de 10 tejos.

Para jugar: https://jaten95.github.io/Tejo-cosmo/

## Cómo está armado

El `index.html` de la raíz es el juego completo en un solo archivo, y es lo que publica GitHub Pages. **No se edita a mano**: se genera a partir de `src/` con `build.py`.

```
src/
  head.html          título, fuentes y estilos
  body.html          HUD, menú, sala, selector de grabados y pantallas
  js/                el juego; se une en este orden
    01-escena.js     cancha, texturas, luces y el tejo
    01b-greda-tablero.js  la greda de barro y el tablero pintado de atrás
    01c-utileria.js  herramientas, canastas de cerveza y banderines del salón
    01d-ambiente.js  bombillos encendidos, polvo en la luz, mesa, sillas plásticas y caneca
    01e-mascotas.js  de vez en cuando pasa un perro criollo o un husky
    02-grabados.js   los diseños grabados en la cara del tejo
    03-fisica.js     vuelo, choques, puntaje, efectos y sonido
    03b-musica.js    música de fondo (se apaga en el menú)
    04-partida.js    turnos, rondas, Don Chepe, cámaras y bucle principal
    05-brazo.js      brazo en primera persona, mano 3D y manilla
    06-salas.js      salas en línea (salas de Claude o Supabase Realtime)
    07-interfaz.js   menú, marcador, controles y arranque
    09-instalar.js   botón para instalar el juego en el celular
  sw.js              service worker: instalar y jugar sin internet
  assets/
    mano-derecha.glb modelo de la mano (ver LICENSES/)
    perro.glb, husky.glb  los perros que pasan (Quaternius, CC0)
build.py             une todo y genera index.html y sw.js
manifest.webmanifest e icon-*.png: datos para instalar el juego como app
musica-vallenato.mp3 la música de fondo; el juego la baja al empezar a jugar (ver LICENSES/)
```

## Generar una versión nueva

```
python3 build.py 1.19
node --check build/juego.js   # revisa que el JavaScript no tenga errores de sintaxis
```

El número de versión sale en la esquina inferior derecha del menú; así se sabe si el celular ya tiene la última. `build/` no se sube al repo: ahí queda también `tejo-claude.html`, la versión que se publica dentro de Claude.

## Instalar en el celular

En GitHub Pages el juego se puede instalar: en Android sale el botón **Instalar en el celular** en el menú; en iPhone, el mismo botón explica cómo agregarlo desde Safari con Compartir → Agregar a inicio. Instalado, se juega sin internet contra Don Chepe, por turnos y en el reto; las salas necesitan conexión. El service worker pide la página a la red primero, así que las versiones nuevas llegan solas.

## Servicios

- **Three.js r128** desde cdnjs y su GLTFLoader desde jsDelivr.
- **Supabase Realtime** para las salas fuera de Claude. Solo usa canales (presence y broadcast), sin tablas. La clave del código es la pública (anon). En el plan gratis el proyecto se pausa tras una semana sin uso.

## Licencias de terceros

El modelo de la mano es `generic-hand` de [WebXR Input Profiles](https://github.com/immersive-web/webxr-input-profiles), con licencia MIT. El aviso está en `LICENSES/` y dentro del juego.

La música de fondo es "Vallenato con ritmo o aire de son" de vjgalaxy, vía [Pixabay](https://pixabay.com), con la licencia de contenido de Pixabay. La nota está en `LICENSES/musica-pixabay.md`.

Los perros (Shiba Inu y Husky) son de [Quaternius](https://quaternius.com), con licencia CC0 (dominio público). La nota está en `LICENSES/quaternius-animales.md`.
