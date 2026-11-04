# Tantos

Aplicación web para practicar el recuento de los tantos de una mano de mus
(cuatro reyes, reglamento navarro). Se te presenta una mano ya jugada, con las
cartas de los cuatro jugadores y lo que se dijo en cada lance, y tienes que
contar cuántas piedras se lleva cada pareja. Cada tanda son 10 manos con
dificultad creciente; se anotan los fallos y, después, el tiempo.

Es una PWA: funciona sin conexión una vez cargada y se puede instalar.

## Instalar en el móvil

- **iPhone (Safari):** Compartir, y después "Añadir a pantalla de inicio".
- **Android (Chrome):** menú, y después "Instalar app".

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # pruebas (Vitest)
npm run build     # comprobación de tipos y build en dist/
npx vite preview  # sirve el build en http://localhost:4173/tantos/
```

La app se sirve bajo `/tantos/` (opción `base` de Vite).

## Regenerar `tests/casos/ordago.json`

Los casos de equivalencia los juega el motor de Python de ordago, que es la
autoridad de las reglas; aquí solo se lee. Desde la raíz de este repositorio:

```bash
uv run --project "<ruta-de-ordago>" \
    python tools/exportar_casos.py \
    --ordago "<ruta-de-ordago>" \
    --salida tests/casos/ordago.json
```

El archivo está comprometido, así que ni las pruebas ni la integración
continua necesitan ordago; solo hace falta regenerarlo si cambian las reglas.

## Iconos

`public/icono.svg` es el original. Los PNG se generan con
`@vite-pwa/assets-generator` (configuración en `pwa-assets.config.ts`):

```bash
npx pwa-assets-generator
```

El generador nombra los archivos a su manera; se renombran a mano a
`icono-192.png`, `icono-512.png`, `icono-maskable-512.png` e
`icono-apple-180.png`.

## Despliegue

Cada push a `main` ejecuta `.github/workflows/desplegar.yml`: instala, pasa las
pruebas, compila y publica `dist/` en GitHub Pages.
