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
    01d-ambiente.js  bombillos encendidos, polvo en la luz, mesa, sillas plásticas, caneca y parlantes
    01e-mascotas.js  de vez en cuando pasa un perro criollo o un husky
    02-grabados.js   los diseños grabados en la cara del tejo
    03-fisica.js     vuelo, choques, puntaje, efectos y sonido
    03b-musica.js    música de fondo: se prende y apaga tocando un parlante o con el switch del menú
    04-partida.js    turnos, rondas, Don Chepe, cámaras y bucle principal
    04b-rana.js      el juego de la rana: la mesa, la física de la argolla, las tandas y Don Chepe
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
python3 build.py 1.43.0
node --check build/juego.js   # revisa que el JavaScript no tenga errores de sintaxis
```

El número de versión sale en la esquina inferior derecha del menú; así se sabe si el celular ya tiene la última. `build/` no se sube al repo: ahí queda también `tejo-claude.html`, la versión que se publica dentro de Claude.

## Versiones

El juego usa [versionado semántico (SemVer)](https://semver.org/lang/es/): **MAYOR.MENOR.PARCHE**, por ejemplo 1.43.0. El número nunca baja.

- **MAYOR** sube cuando el cambio rompe lo anterior: se pierden los récords, la partida guardada o los ajustes, o el juego cambia por completo. MENOR y PARCHE vuelven a 0.
- **MENOR** sube con algo nuevo, algo que se quita o un cambio en cómo se juega: una regla, la física del tejo, una opción, un objeto en el salón. PARCHE vuelve a 0.
- **PARCHE** sube con arreglos y ajustes de lo que ya existe que no cambian cómo se juega: textos, posiciones, colores, sonido, volumen, tiempos de la decoración.

En las salas todos deben tener la misma **MAYOR.MENOR** (así las reglas y la física son iguales para todos); con distinto PARCHE sí se puede jugar junto. Si alguien tiene otra versión, el juego le dice quién debe actualizar.

`build.py` solo acepta números así (`python3 build.py 1.43.0`).

**Modo beta:** lo que todavía se está probando (por ahora la rana) no sale en el menú. Se prende en un celular tocando 7 veces la versión del menú y escribiendo el código; otras 7 veces lo apagan. No es seguridad: solo esconde lo que está en prueba.

<details>
<summary>Hasta la v1.63 el número subía de a uno en cada cambio. Así quedó cada versión con SemVer (la v1.63 equivale a la 1.42.0), y las que siguieron.</summary>

| Antes | SemVer | Tipo | Qué trajo |
|---|---|---|---|
| — | 1.0.0 | Agregado | el juego: contra Don Chepe, por turnos y el reto |
| — | 1.1.0 | Agregado | salas en línea con Supabase en GitHub Pages |
| — | 1.2.0 | Agregado | salas: botón Actualizar y anfitrión automático |
| — | 1.3.0 | Agregado | salas: tiros directos entre jugadores y reconexión automática |
| — | 1.4.0 | Agregado | imagen, título y descripción al compartir el enlace |
| — | 1.4.1 | Arreglado | salas: el puntaje ya no retrocede al reconectarse |
| — | 1.4.2 | Arreglado | salas: desconexiones constantes |
| v1.11 | 1.5.0 | Agregado | la versión en el menú |
| v1.12 | 1.6.0 | Cambiado | una mecha reventada no se repone hasta la siguiente ronda |
| v1.13 | 1.7.0 | Agregado | grabados en la cara del tejo |
| v1.14 | 1.8.0 | Cambiado | no se entra a una partida empezada; aviso de sala llena |
| v1.15 | 1.9.0 | Agregado | salas: 15 s para lanzar |
| v1.16 | 1.10.0 | Agregado | grabado de la bandera del orgullo |
| v1.17 | 1.10.1 | Arreglado | grabado del orgullo sin asta |
| v1.18 | 1.11.0 | Agregado | brazo en primera persona con mano y manilla |
| v1.19 | 1.12.0 | Agregado | choques entre tejos |
| v1.20 | 1.13.0 | Agregado | rebote en otro tejo y salida de la greda |
| v1.21 | 1.14.0 | Agregado | equipos al azar y hasta 6 jugadores |
| v1.22 | 1.15.0 | Agregado | repetición de la moñona |
| v1.23 | 1.16.0 | Agregado | reacciones en sala |
| v1.24 | 1.17.0 | Agregado | ambiente de cancha y música carranguera |
| v1.25 | 1.18.0 | Agregado | instalable en el celular |
| v1.26 | 1.18.1 | Cambiado | ambiente con gente hablando |
| v1.27 | 1.19.0 | Quitado | ambiente de cancha y música |
| v1.28 | 1.20.0 | Agregado | aviso de versión nueva en la app instalada |
| v1.29 | 1.20.1 | Arreglado | pantalla negra al volver a la app |
| v1.30 | 1.20.2 | Cambiado | modo «Turnos local» y sin nombres de ejemplo |
| v1.31 | 1.21.0 | Agregado | greda de barro y tablero pintado |
| v1.32 | 1.21.1 | Cambiado | «CLUB DE TEJO» más grande en el tablero |
| v1.33 | 1.21.2 | Arreglado | letras que salían con otra fuente en el celular |
| v1.34 | 1.21.3 | Cambiado | águila en el medallón del tablero |
| v1.35 | 1.21.4 | Cambiado | medallón sin fondo azul |
| v1.36 | 1.22.0 | Agregado | cancha sobre el piso con marco oxidado; opciones de lupa y barra de fuerza |
| v1.36 | 1.23.0 | Agregado | pizarra de tiza arriba de la cancha |
| v1.37 | 1.24.0 | Agregado | botones para acercar y alejar la cámara |
| v1.38 | 1.25.0 | Cambiado | ayuda que se puede cerrar, turnos de 20 s; arreglo de letra en Safari |
| v1.39 | 1.26.0 | Agregado | herramientas en la esquina izquierda |
| v1.40 | 1.27.0 | Agregado | canastas de cerveza y botellas |
| v1.41 | 1.27.1 | Cambiado | botones de zoom arriba a la derecha |
| v1.42 | 1.27.2 | Cambiado | canastas negras y botellas retornables |
| v1.43 | 1.27.3 | Cambiado | ayuda de cómo lanzar en dos líneas |
| v1.44 | 1.28.0 | Agregado | banderines en las cuatro paredes (se quitan la bandera y la pizarra) |
| v1.45 | 1.29.0 | Cambiado | sin puntos, la mano sale primero |
| v1.46 | 1.30.0 | Agregado | Don Chepe en parejas o tríos con bots |
| v1.47 | 1.30.1 | Arreglado | la mecha salía reventada en la repetición |
| v1.48 | 1.31.0 | Cambiado | en salas todos usan la configuración del anfitrión |
| v1.49 | 1.32.0 | Cambiado | los tejos caen acostados, inclinados o de canto |
| v1.50 | 1.33.0 | Agregado | el tejo se puede resbalar en el aro del bocín |
| v1.51 | 1.33.1 | Cambiado | tejo nuevo, como los de verdad |
| v1.52 | 1.33.2 | Arreglado | el sonido no volvía al regresar al juego |
| v1.53 | 1.34.0 | Agregado | gente mirando la partida |
| v1.54 | 1.35.0 | Quitado | la gente del salón |
| v1.55 | 1.36.0 | Agregado | bombillos, polvo, mesa, sillas plásticas y caneca |
| v1.56 | 1.37.0 | Agregado | perros que pasan por el salón |
| v1.57 | 1.38.0 | Agregado | música de fondo |
| v1.58 | 1.39.0 | Agregado | parlantes que prenden o apagan la música |
| v1.59 | 1.40.0 | Quitado | botón de silenciar |
| v1.60 | 1.40.1 | Cambiado | el perro sale más seguido |
| v1.61 | 1.41.0 | Cambiado | si hubo puntos, lanza primero el que más hizo |
| v1.62 | 1.41.1 | Arreglado | punto rojo de la repetición ovalado |
| v1.63 | 1.42.0 | Cambiado | la repetición ya no se salta; títulos que caben en el celular |
| — | 1.43.0 | Agregado | versiones con SemVer y aviso en salas si alguien tiene otra versión |
| — | 1.44.0 | Agregado | partida a otro valor (de 3 a 99) |
| — | 1.45.0 | Agregado | el juego de la rana (en beta), contra Don Chepe, por turnos y en salas; modo beta con código |

</details>

## Instalar en el celular

En GitHub Pages el juego se puede instalar: en Android sale el botón **Instalar en el celular** en el menú; en iPhone, el mismo botón explica cómo agregarlo desde Safari con Compartir → Agregar a inicio. Instalado, se juega sin internet contra Don Chepe, por turnos y en el reto; las salas necesitan conexión. El service worker pide la página a la red primero, así que las versiones nuevas llegan solas.

## Servicios

- **Three.js r128** desde cdnjs y su GLTFLoader desde jsDelivr.
- **Supabase Realtime** para las salas fuera de Claude. Solo usa canales (presence y broadcast), sin tablas. La clave del código es la pública (anon). En el plan gratis el proyecto se pausa tras una semana sin uso.

## Licencias de terceros

El modelo de la mano es `generic-hand` de [WebXR Input Profiles](https://github.com/immersive-web/webxr-input-profiles), con licencia MIT. El aviso está en `LICENSES/` y dentro del juego.

La música de fondo es "Vallenato con ritmo o aire de son" de vjgalaxy, vía [Pixabay](https://pixabay.com), con la licencia de contenido de Pixabay. La nota está en `LICENSES/musica-pixabay.md`.

Los perros (Shiba Inu y Husky) son de [Quaternius](https://quaternius.com), con licencia CC0 (dominio público). La nota está en `LICENSES/quaternius-animales.md`.
