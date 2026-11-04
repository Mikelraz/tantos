/** Casillas Nosotros/Ellos y teclado numérico propio (no el del sistema). */
import { NOMBRE_PAREJA } from '../juego/textos';
import { h, svg } from './dom';

const MAX_DIGITOS = 2;
const DIGITOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

function iconoBorrar(doc: Document): SVGElement {
  return svg(
    doc,
    'svg',
    { viewBox: '0 0 24 24', class: 'icono', 'aria-hidden': 'true', focusable: 'false' },
    svg(doc, 'path', {
      d: 'M9 5h11v14H9l-6-7z M12.5 9.5l5 5 M17.5 9.5l-5 5',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 2,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    }),
  );
}

export function crearTeclado(
  doc: Document,
  alComprobar: (respuesta: [number, number]) => void,
): HTMLElement {
  const valores: [string, string] = ['', ''];
  let seleccionada: 0 | 1 = 0;

  const casillas = ([0, 1] as const).map((p) => {
    const b = h(
      doc,
      'button',
      { type: 'button', class: `casilla pareja-${p}`, 'data-casilla': String(p) },
      h(doc, 'span', { class: 'nombre' }, NOMBRE_PAREJA[p]),
      h(doc, 'span', { class: 'valor' }),
    );
    b.addEventListener('click', () => {
      seleccionada = p;
      pintar();
    });
    return b;
  });

  const comprobar = h(doc, 'button', { type: 'button', class: 'comprobar' }, 'Comprobar');
  comprobar.addEventListener('click', () => {
    if (valores[0] === '' || valores[1] === '') return;
    alComprobar([Number(valores[0]), Number(valores[1])]);
  });

  function pintar(): void {
    casillas.forEach((b, p) => {
      const activa = p === seleccionada;
      b.classList.toggle('seleccionada', activa);
      b.setAttribute('aria-pressed', String(activa));
      const valor = b.querySelector('.valor');
      if (valor) valor.textContent = valores[p] as string;
    });
    comprobar.disabled = valores[0] === '' || valores[1] === '';
  }

  function teclear(tecla: string): void {
    const actual = valores[seleccionada];
    if (tecla === 'borrar') valores[seleccionada] = actual.slice(0, -1);
    else if (actual.length < MAX_DIGITOS) valores[seleccionada] = actual + tecla;
    pintar();
  }

  const teclas = DIGITOS.map((d) => {
    const b = h(doc, 'button', { type: 'button', class: 'tecla', 'data-tecla': d }, d);
    b.addEventListener('click', () => teclear(d));
    return b;
  });
  const borrar = h(
    doc,
    'button',
    { type: 'button', class: 'tecla borrar', 'data-tecla': 'borrar', 'aria-label': 'Borrar' },
    iconoBorrar(doc),
  );
  borrar.addEventListener('click', () => teclear('borrar'));

  pintar();
  return h(
    doc,
    'section',
    { class: 'respuesta' },
    h(doc, 'div', { class: 'casillas' }, ...casillas),
    h(doc, 'div', { class: 'teclado' }, ...teclas, borrar, comprobar),
  );
}
