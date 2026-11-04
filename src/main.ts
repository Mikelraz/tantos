// Source Sans 3: estrecha (cabe en la tabla del móvil sin partir líneas), cifras tabulares por defecto
// y cero sin tachar; y la misma letra en todos los móviles.
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-500.css';
import '@fontsource/source-sans-3/latin-700.css';
import './ui/estilos.css';
import { montarApp, type ResultadoCompartir } from './ui/app';

/** Hasta acceder a `localStorage` puede lanzar (Safari en modo privado, datos bloqueados). */
function almacenProtegido(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** El menú de compartir del móvil (WhatsApp, etc.); si no lo hay, al portapapeles. */
async function compartir(texto: string): Promise<ResultadoCompartir> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: texto });
      return 'compartido';
    } catch (e) {
      // Cerrar el menú sin elegir no es un error que haya que tapar copiando.
      if (e instanceof DOMException && e.name === 'AbortError') return null;
    }
  }
  try {
    await navigator.clipboard.writeText(texto);
    return 'copiado';
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
    hoy: () => new Date(),
    enlace: new URL(import.meta.env.BASE_URL, location.origin).href,
    compartir,
  });
}
