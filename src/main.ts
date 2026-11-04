// Source Sans 3: estrecha (cabe en la tabla del móvil sin partir líneas), cifras tabulares por defecto
// y cero sin tachar; y la misma letra en todos los móviles.
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-500.css';
import '@fontsource/source-sans-3/latin-700.css';
import './ui/estilos.css';
import { montarApp } from './ui/app';

/** Hasta acceder a `localStorage` puede lanzar (Safari en modo privado, datos bloqueados). */
function almacenProtegido(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const raiz = document.getElementById('app');
if (raiz) {
  montarApp(raiz, {
    rng: Math.random,
    ahora: () => performance.now(),
    almacen: almacenProtegido(),
    documento: document,
  });
}
