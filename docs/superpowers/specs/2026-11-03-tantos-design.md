# Tantos — diseño

Fecha: 2026-11-03. Estado: borrador para aprobación.

## Qué es y por qué

Un juego de cálculo mental para el móvil: practicar **contar los tantos de una mano de mus
terminada**, con el objetivo de llegar a contarlos bien y muy rápido. Pensado para ratos
muertos: se abre desde un icono en la pantalla de inicio, funciona sin conexión y sirve igual en
iPhone y Android.

Es un proyecto independiente de `ordago` (el proyecto de investigación de estrategia de mus en
`<ruta-de-ordago>`), pero usa el motor de ordago como
**comprobador** de sus reglas (ver "Reglas" y "Comprobación contra ordago").

## Objetivos

- Presentar una mano de mus terminada (cartas de los cuatro jugadores + qué pasó en cada lance) y
  pedir los tantos que se lleva cada pareja.
- Medir y premiar la velocidad *sin sacrificar* la exactitud.
- Explicar cada fallo lance a lance para que el jugador aprenda dónde se equivocó.
- Mostrar la evolución del jugador entre tandas.

## No objetivos

- Jugar al mus (apostar, descartar). Las manos llegan ya jugadas.
- El marcador de la partida (piedras acumuladas, amarrakos, vacas). Solo se cuentan los tantos de
  **esa** mano.
- Multijugador, cuentas, rankings online, sincronización entre dispositivos.
- Variantes de reglas configurables. La app juega con las reglas de una mesa (ver "Reglas").
- Publicación en tiendas de apps.

## Anti-objetivos (fallaría aunque funcione técnicamente)

- **Que la app cuente distinto que la mesa del jugador.** Una respuesta "correcta" según la app
  que la mesa considera incorrecta enseña mal. Por eso las reglas se comprueban contra ordago.
- Que meter la respuesta cueste más que contarla (teclado del sistema, menús, animaciones que
  hacen esperar). El tiempo medido debe ser tiempo de cálculo.
- Que las marcas de distintas tandas no sean comparables.

## Plataforma y cómo se hace

Decidido con el usuario:

- **App web instalable (PWA)**, no app nativa. Se instala con "Añadir a pantalla de inicio",
  funciona sin conexión (service worker que precachea todo), a pantalla completa (manifest con
  `display: standalone`), con icono propio.
- **Proyecto aparte** en `~/dev/tantos` (fuera de OneDrive a propósito, por
  `node_modules`).
- **Las reglas se reimplementan en la app**, y ordago verifica la reimplementación.

Decisiones del diseñador (el usuario no las ha pedido; se pueden cambiar):

- TypeScript, sin framework de UI (DOM directo), empaquetado con Vite; pruebas con Vitest. La app
  es pequeña y debe arrancar al instante en un móvil.
- Alojamiento en **GitHub Pages** desde un repositorio en la cuenta de GitHub del usuario
  (`Mikelraz`, `gh` ya autenticado en la máquina), desplegado por GitHub Actions. El repositorio
  será **público** (Pages gratis lo exige salvo con GitHub Pro); no contiene nada sensible.
- Todo el texto de la interfaz, el código de dominio y los comentarios en castellano, con el
  vocabulario del mus (`mano`, `lance`, `envite`, `pareja`, `tantos`…), igual que ordago.
- Las cartas se dibujan con CSS/SVG propio, al estilo del naipe español: el número arriba a la izquierda (también las figuras: sota 10, caballo 11, rey 12) en tinta negra, el palo abajo a la derecha y el marco con las pintas de su palo. El color del palo no se usa en los números para no confundirlo con el azul y el rojo de las parejas.
  El palo no influye en nada; está por realismo. Sin imágenes de barajas comerciales.

## Reglas

Mus de **cuatro reyes**, reglamento **navarro**, tal como se juega en la mesa del usuario. Son
exactamente las reglas del motor de ordago con esta configuración:

```python
ConfigPartida(
    variant=VarianteBaraja.CUATRO_REYES,
    tanteo=ReglasTanteo(
        piedra_paso=1,
        min_envido=2,
        ordago_acaba_partida=True,
        real_valida=False,
        paso_paga_en_jugada=False,   # ¡ojo! hoy no es el valor por defecto de ordago
    ),
)
```

**El motor de ordago es la autoridad.** Si este resumen y el motor discrepan, manda el motor
(`src/ordago/engine/scoring.py`, `game.py::_liquidar_cotejos`, `betting.py`,
`evaluation/evaluators.py`). Resumen para quien implementa:

**Baraja:** 40 cartas, rangos As, 2, 3, 4, 5, 6, 7, Sota, Caballo, Rey (cuatro de cada). Con cuatro
reyes, el 3 y el 2 valen lo que pone (no hacen de rey ni de as). Valor para juego/punto: figuras 10,
el resto su número.

**Asientos y mano:** cuatro jugadores; las parejas son asientos 0+2 y 1+3. La *mano* es el primero
en hablar. **Todo empate en el cotejo lo gana el jugador más cercano a la mano** (siguiendo el orden
de juego desde la mano).

**El juego gira en sentido antihorario** (confirmado por el usuario): después de un jugador habla
el que tiene a su **derecha**. El motor solo conoce números de asiento (el asiento `k+1` habla
después del `k`); la correspondencia con la pantalla la fija la app, y es fija:

| Asiento relativo al jugador | Posición en pantalla |
|---|---|
| Tú (`t`) | abajo |
| `t+1` (rival que habla después de ti) | **derecha** |
| `t+2` (compañero) | arriba |
| `t+3` (rival que habla antes que tú) | **izquierda** |

Así, recorrer la mesa desde la mano en orden de juego es abajo → derecha → arriba → izquierda (o
el tramo que toque según dónde esté la mano). Las pruebas contra ordago **no** pueden detectar un
error aquí (comparan asientos, no posiciones), así que la app necesita su propia prueba de esta
correspondencia. *Aviso:* en ordago, `evaluation/showdown.py` describe la cercanía "en sentido
horario" y `play/state.py::etiqueta_puesto` llama "izquierda" al asiento `+1`; ambos textos
contradicen esta regla y no deben copiarse (ver "Cambio aparte en ordago").

**Lances**, en orden: grande, chica, pares, y juego **o** punto (punto solo si ningún jugador
tiene juego).

- **Grande:** se comparan las cuatro cartas ordenadas de mayor a menor, carta a carta.
- **Chica:** se comparan ordenadas de menor a mayor; gana la más baja.
- **Pares:** pareja (dos iguales) < medias (tres iguales) < duples (dos parejas, o cuatro iguales,
  que cuentan como duples del mismo rango y ganan a cualquier duples con ese rango como mayor). Dentro
  de la categoría, por rango (duples: primero la pareja mayor, luego la menor).
- **Juego:** suma ≥ 31. Orden: 31 > 32 > 40 > 39 > 38 > 37 > 36 > 35 > 34 > 33. *La real* (tres
  sietes + una figura) es un 31 normal: **no** gana a otro 31; el empate lo decide la mano.
- **Punto:** si nadie tiene juego, gana la suma más alta (todas ≤ 30).
- Pares y juego solo se envidan si **las dos parejas** tienen al menos un jugador con pares (o con
  juego). Si solo una pareja tiene, el lance no se envida y esa pareja lo gana. Si nadie tiene, el
  lance no da nada.

**Qué se cobra** (por lance, a la pareja ganadora):

| Situación | Piedras de apuesta | Tantos de las cartas |
|---|---|---|
| Grande o chica sin envite | 1 | — |
| Pares / juego sin envite, o no envidable porque solo una pareja tiene | 0 | sí |
| Punto sin envite | 0 | 1 |
| Envite querido | lo apostado | sí (pares/juego), 1 (punto) |
| Envite no querido | lo que había antes de la última apuesta (1 si solo hubo un envido sin subir) | sí (pares/juego), 1 (punto) |
| Órdago no querido | lo que había antes del órdago (1 si fue la apertura) | sí (pares/juego), 1 (punto) |
| Órdago querido | — no se genera nunca (decide la partida; no hay nada que contar) | — |

- **Tantos de pares:** se suman los de **los dos jugadores de la pareja ganadora** que tengan pares:
  pareja 1, medias 2, duples 3. Los pares del rival no cuentan.
- **Tantos de juego:** igual, sobre los dos jugadores de la pareja ganadora que tengan juego: 31 vale
  3, cualquier otro juego 2.
- **Punto:** 1 fijo a la pareja ganadora (no por jugador).
- Los tantos se cobran **también cuando el lance se gana por un "no quiero"**: la pareja que envidó
  pares y no se lo quisieron cobra la piedra del rechazo *más* sus propios tantos de pares, aunque el
  rival tuviera mejores pares.
- En un envite querido de pares o juego se cobra lo apostado más los tantos de la pareja que gana el
  cotejo.

**Apuestas:** envido mínimo 2. Una subida ("envido 2", "5 más") eleva lo apostado; si la subida
no se quiere, quien subió cobra lo que había **antes** de su subida (p. ej. "Nosotros envido 2,
Ellos 5 más, Nosotros no quiero" → Ellos cobra 2). Ver `betting.py` (`pendiente` / `valor_rechazo`)
para la mecánica exacta. Las apuestas nunca superan lo que vale la partida (40); con manos que
empiezan 0–0 eso no limita casi nada.

## El juego

### Una tanda

- **Siempre 10 manos**, para que todas las marcas sean comparables.
- **Dificultad ascendente dentro de la tanda** (decidido con el usuario). El reparto concreto es
  decisión del diseñador y debe ser fijo:
  - Manos 1–3 — *solo cartas*: ningún lance tiene envite.
  - Manos 4–6 — *envites sencillos*: uno o dos lances con un único envido (querido o no querido),
    sin subidas ni órdagos.
  - Manos 7–10 — *de todo*: al menos un lance con subida o con órdago no querido; puede haber
    varios lances envidados.
- Las manos las genera la propia app (aleatorias, sin fin), cumpliendo el nivel de su posición.

### Generación de una mano

- Repartir cuatro manos de cuatro cartas de una baraja barajada; elegir la mano al azar (rota, para
  practicar los desempates).
- El jugador siempre se sienta **abajo** ("Tú"); su compañero arriba; los rivales a izquierda y
  derecha. La pareja del jugador es *Nosotros*; la otra, *Ellos*.
- Generar para cada lance una secuencia de apuestas **legal** (solo hablan los jugadores que
  participan en el lance; pares/juego solo se envidan si ambas parejas participan) y **creíble**
  (sin que sea una simulación de estrategia; basta con que no parezca absurda a un jugador de mus).
  Nunca un órdago querido.
- Con cuántos envites, de qué tamaño y en qué lances es decisión del implementador dentro de las
  restricciones del nivel.

### Pantalla de mano (vista "Mesa", elegida por el usuario)

Ver el boceto en `docs/mockups/pantalla-mano.html` (opción A).

- Arriba: "Mano N / 10" y el cronómetro.
- Centro: las cuatro manos sentadas como en la mesa (Tú abajo, Compañero arriba, rivales a los
  lados), coloreadas por pareja, y la mano marcada.
- Debajo, una línea por lance con **lo que pasó en la apuesta**, en lenguaje de mesa y diciendo
  qué pareja habló (p. ej. "Grande: Nosotros envido 2 · Ellos quiero"; "Chica: Ellos envido 2 ·
  Nosotros no quiero"; "Juego: Ellos envido 2 · Nosotros 5 más · Ellos no quiero"; "Pares: sin
  envite"). **Nunca dice quién gana el lance**: eso lo deduce el jugador de las cartas.
  - Pares o juego no envidables (solo una pareja tiene, o nadie) se muestran igual que "sin envite".
    Lo que se cobra no cambia con las reglas de esta mesa y no se regala información.
  - El último lance se rotula "Juego" o "Punto" según corresponda (en la mesa real esto es público).
- Dos casillas, **Nosotros** y **Ellos**, y un **teclado numérico propio, grande**, en pantalla
  (no el teclado del sistema). Tocar una casilla la selecciona; borrar; botón **Comprobar**.
- El cronómetro arranca cuando aparecen las cartas y se para al pulsar Comprobar.

### Comprobación

- La mano es correcta solo si **los dos números** coinciden.
- Acierto → pasa directamente a la siguiente mano.
- Fallo → pantalla de solución (abajo). El cronómetro está parado mientras se ve; se continúa con
  **Siguiente**. No se repite la mano.

### Pantalla de solución (versión "Explicada", elegida por el usuario)

Ver el boceto en `docs/mockups/pantalla-solucion.html` (opción B).

- Veredicto: tu respuesta y la correcta ("Fallo · tú: 6 – 6 · era: 4 – 6").
- Las cartas siguen a la vista.
- Tabla por lance con columnas Nosotros / Ellos y una línea corta por lance que explica quién gana
  y de dónde sale cada tanto ("31 gana a 32 · envite 2 + 31 vale 3"). Fila de total.
- Los lances donde la suma por pareja del jugador habría discrepado no se pueden saber (solo se
  piden totales), así que el resaltado en rojo marca la **pareja** que ha fallado en el total, no un
  lance concreto. *(Nota: el boceto pinta en rojo el lance de juego por claridad del ejemplo; la
  implementación no puede saber qué lance se contó mal.)*
- Tocar un lance resalta las cartas que lo deciden.

### Puntuación

Decidido con el usuario:

- Una tanda tiene **dos marcas: número de fallos y tiempo total** (suma de los tiempos de las 10
  manos, en décimas de segundo).
- **Se ordena primero por fallos, luego por tiempo.** Menos es mejor. Una tanda de 0 fallos
  siempre queda por delante de una de 1 fallo, sea cual sea el tiempo.
- Fallar **no** añade tiempo. El tiempo de las manos falladas cuenta igual en el total.

### Fin de tanda

- Fallos y tiempo; comparación con la mejor marca ("nueva mejor marca" si lo es).
- Una pequeña gráfica con la evolución de las últimas tandas (decisión del diseñador).
- Botón para empezar otra tanda.

### Interrupciones (decisión del diseñador)

- Si la app pasa a segundo plano (`visibilitychange` a oculta: llamada, cambio de app, bloqueo de
  pantalla), el cronómetro se **pausa** y las cartas se **tapan** hasta volver, para que no se pueda
  pensar con el reloj parado. Al volver, un toque las destapa y el reloj sigue.
- Si la app se cierra del todo (o se recarga) a mitad de tanda, la tanda se da por **abandonada** y
  no cuenta. No se guarda la tanda en curso.

### Historial

- Se guarda en el propio dispositivo (`localStorage`, con lectura/escritura protegidas por
  `try/catch`; la app funciona igual sin él). Si el usuario borra los datos del navegador, se pierde;
  aceptado.
- Por tanda: fecha, fallos, tiempo total, tiempo por mano y aciertos por mano (útil para ver qué
  nivel cuesta más).
- Una tanda abandonada a medias no cuenta.

## Comprobación contra ordago

El riesgo principal del proyecto es que la reimplementación en TypeScript cuente distinto que el
motor. Se mitiga así:

1. Un script de exportación (vive en este repositorio, p. ej. `tools/exportar_casos.py`, y se ejecuta
   con el entorno de ordago: `uv run --project <ruta-de-ordago>
   python tools/exportar_casos.py`) juega con el motor de ordago **varios miles de manos** con la
   configuración de "Reglas" puesta explícitamente (no confiar en los valores por defecto del motor,
   que están a punto de cambiar).
2. Para cada mano guarda en un JSON comprometido (`tests/casos/ordago.json`): las cuatro manos
   finales (tras el descarte), el asiento mano, la secuencia de acciones de cada lance y lo que cobra
   cada pareja en cada lance según `EventoTanteo`. Se descartan las manos con órdago querido y
   cualquier mano en la que una pareja alcance 40 a mitad (el tope recortaría lo cobrado). El JSON
   registra el commit de ordago contra el que se exportó.
3. Las acciones las deben generar agentes que cubran **todas** las resoluciones (`en_paso`,
   `sin_rival`, `sin_participantes`, `querido`, `no_querido`, subidas, órdago no querido), no solo
   las que produce una política razonable. Si ordago no tiene un agente de acciones legales
   aleatorias, el script lo define.
4. Una prueba de Vitest recorre todos los casos y exige que el contador de la app dé **exactamente**
   lo mismo por lance y por pareja. El script imprime un resumen de cobertura por resolución y lance.

El contador de la app (cartas + mano + secuencias de apuesta → tantos por lance y pareja) es una
función pura separada de la generación de manos y de la interfaz, para poder probarla así.

## Cambio aparte en ordago (no es parte de este proyecto)

El usuario quiere que ordago tenga `paso_paga_en_jugada=False` por defecto. Cambiar el valor es una
línea en `engine/config.py`, pero todos los resultados comprometidos (`results/policy.json`,
`ceiling.json`, `transfer.json`, el dossier PDF) y los números del README se derivaron con `True`.
Se hará como tarea separada en ordago, en su propia rama, dejando constancia de con qué regla se
obtuvo cada resultado (o volviendo a derivarlos). Este proyecto no depende de ello porque el script
de exportación fija la configuración explícitamente.

En la misma tarea conviene corregir el sentido de giro en ordago: `evaluation/showdown.py` dice
"sentido horario" y `play/state.py::etiqueta_puesto` etiqueta el asiento `+1` como "rival
(izquierda)", cuando en el mus (y en la mesa del usuario) el juego es antihorario y el siguiente
está a la derecha. La lógica del motor (por números de asiento) no cambia; sí lo que ve el jugador en
`ordago-play`.

## Lo que queda al implementador

- Estructura del repositorio, herramientas de lint/formato, workflow de despliegue.
- El algoritmo de generación de apuestas creíbles y las probabilidades.
- Aspecto visual concreto (los bocetos fijan disposición y contenido, no el estilo final), siempre
  legible a una mano en un móvil de ~360 px de ancho, y con modo oscuro.
- Diseño del icono.
- Formato exacto del JSON de casos.
