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
    02-grabados.js   los diseños grabados en la cara del tejo
    03-fisica.js     vuelo, choques, puntaje, efectos y sonido
    04-partida.js    turnos, rondas, Don Chepe, cámaras y bucle principal
    05-brazo.js      brazo en primera persona, mano 3D y manilla
    06-salas.js      salas en línea (salas de Claude o Supabase Realtime)
    07-interfaz.js   menú, marcador, controles y arranque
  assets/
    mano-derecha.glb modelo de la mano (ver LICENSES/)
build.py             une todo y genera index.html
```

## Generar una versión nueva

```
python3 build.py 1.19
node --check build/juego.js   # revisa que el JavaScript no tenga errores de sintaxis
```

El número de versión sale en la esquina inferior derecha del menú; así se sabe si el celular ya tiene la última. `build/` no se sube al repo: ahí queda también `tejo-claude.html`, la versión que se publica dentro de Claude.

## Servicios

- **Three.js r128** desde cdnjs y su GLTFLoader desde jsDelivr.
- **Supabase Realtime** para las salas fuera de Claude. Solo usa canales (presence y broadcast), sin tablas. La clave del código es la pública (anon). En el plan gratis el proyecto se pausa tras una semana sin uso.

## Licencias de terceros

El modelo de la mano es `generic-hand` de [WebXR Input Profiles](https://github.com/immersive-web/webxr-input-profiles), con licencia MIT. El aviso está en `LICENSES/` y dentro del juego.
