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
