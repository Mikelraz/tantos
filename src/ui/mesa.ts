/** Pantalla de mano (vista "Mesa"): las cuatro jugadas sentadas, los lances y el teclado. */
import { fuerzaRango, type Carta, type Palo, type Rango } from '../reglas/cartas';
import type { ManoJugada } from '../reglas/contar';
import { parejaDe } from '../reglas/cotejo';
import { etiquetaPuesto, lineaLance, posicionEnPantalla, simbolo } from '../juego/textos';
import { h, svg } from './dom';
import { crearTeclado } from './teclado';

const NOMBRE_PALO: Record<Palo, string> = { 0: 'oros', 1: 'copas', 2: 'espadas', 3: 'bastos' };
const NOMBRE_RANGO: Record<Rango, string> = {
  1: 'As', 2: 'Dos', 3: 'Tres', 4: 'Cuatro', 5: 'Cinco', 6: 'Seis', 7: 'Siete',
  10: 'Sota', 11: 'Caballo', 12: 'Rey',
};

/** Dibujo propio de cada palo (viewBox 20×20). */
function iconoPalo(doc: Document, palo: Palo): SVGElement {
  const formas: Record<Palo, () => SVGElement[]> = {
    0: () => [
      svg(doc, 'circle', { cx: 10, cy: 10, r: 8.4, class: 'relleno' }),
      svg(doc, 'circle', { cx: 10, cy: 10, r: 5.6, class: 'trazo' }),
      svg(doc, 'circle', { cx: 10, cy: 10, r: 2, class: 'nudo' }),
    ],
    1: () => [
      svg(doc, 'path', { d: 'M3.5 2.5h13c0 5.6-2.6 8.6-6.5 8.6S3.5 8.1 3.5 2.5z', class: 'relleno' }),
      svg(doc, 'rect', { x: 3.5, y: 2.5, width: 13, height: 1.6, class: 'nudo' }),
      svg(doc, 'rect', { x: 9, y: 10.5, width: 2, height: 4.5, class: 'relleno' }),
      svg(doc, 'rect', { x: 5.5, y: 15, width: 9, height: 2.6, rx: 1, class: 'relleno' }),
    ],
    2: () => [
      svg(doc, 'path', { d: 'M10 .8l2 2.8v9H8v-9z', class: 'relleno' }),
      svg(doc, 'path', { d: 'M3.6 12.2h12.8c0 1.3-1 2.2-2.2 2.2H5.8c-1.2 0-2.2-.9-2.2-2.2z', class: 'nudo' }),
      svg(doc, 'rect', { x: 9, y: 14.4, width: 2, height: 3.4, class: 'relleno' }),
      svg(doc, 'circle', { cx: 10, cy: 18.4, r: 1.4, class: 'nudo' }),
    ],
    3: () => [
      svg(doc, 'path', {
        d: 'M8.2 1.6c2.6-1.1 5.3.4 5 3.4l-1.4 13.4H8.4L7 5.2c-.2-1.5.1-3 1.2-3.6z',
        class: 'relleno',
      }),
      svg(doc, 'circle', { cx: 8.6, cy: 7.5, r: 1, class: 'nudo' }),
      svg(doc, 'circle', { cx: 11, cy: 11.5, r: 1, class: 'nudo' }),
      svg(doc, 'circle', { cx: 9.4, cy: 15, r: 0.9, class: 'nudo' }),
    ],
  };
  return svg(
    doc,
    'svg',
    { viewBox: '0 0 20 20', class: 'palo', 'aria-hidden': 'true', focusable: 'false' },
    ...formas[palo](),
  );
}

/**
 * Marco de la baraja española (viewBox 40×57). Sus cortes, las "pintas", dicen el palo:
 * oros ninguno, copas uno, espadas dos y bastos tres, arriba y abajo.
 */
function marco(doc: Document, palo: Palo): SVGElement {
  const [x0, x1, y0, y1, r] = [3, 37, 3, 54, 2.5];
  const cortes = palo;
  const hueco = 2.6;
  const paso = 5.2;
  // Tramos de un borde horizontal, de izquierda a derecha, dejando los huecos en el centro.
  const tramos: Array<[number, number]> = [];
  let desde = x0 + r;
  for (let i = 0; i < cortes; i++) {
    const centro = 20 + (i - (cortes - 1) / 2) * paso;
    tramos.push([desde, centro - hueco / 2]);
    desde = centro + hueco / 2;
  }
  tramos.push([desde, x1 - r]);
  const horizontales = (y: number) => tramos.map(([a, b]) => `M${a} ${y}H${b}`).join('');
  const lados =
    `M${x0 + r} ${y0}A${r} ${r} 0 0 0 ${x0} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 0 ${x0 + r} ${y1}` +
    `M${x1 - r} ${y0}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}`;
  return svg(
    doc,
    'svg',
    { viewBox: '0 0 40 57', preserveAspectRatio: 'none', class: 'marco', 'aria-hidden': 'true', focusable: 'false' },
    svg(doc, 'path', { d: horizontales(y0) + horizontales(y1) + lados }),
  );
}

function dibujarCarta(doc: Document, c: Carta): HTMLElement {
  return h(
    doc,
    'span',
    {
      class: `carta palo-${c.palo}`,
      role: 'img',
      'aria-label': `${NOMBRE_RANGO[c.rango]} de ${NOMBRE_PALO[c.palo]}`,
    },
    marco(doc, c.palo),
    // Un solo número por carta: repetido boca abajo dobla lo que hay que leer.
    h(doc, 'span', { class: 'indice', 'aria-hidden': 'true' }, simbolo(c)),
    iconoPalo(doc, c.palo),
  );
}

export interface Mesa {
  elemento: HTMLElement;
  /** Resalta las jugadas de esos asientos (vacío: ninguna). */
  resaltar(puestos: readonly number[]): void;
  tapar(si: boolean): void;
}

export function dibujarMesa(doc: Document, m: ManoJugada): Mesa {
  const jugadas = m.jugadas.map((j, puesto) => {
    // Solo para leerlas mejor: de mayor a menor, como se colocan en la mano.
    const cartas = [...j].sort((a, b) => fuerzaRango(b.rango) - fuerzaRango(a.rango));
    const esMano = puesto === m.mano;
    return h(
      doc,
      'div',
      {
        class: `jugada pareja-${parejaDe(puesto)} pos-${posicionEnPantalla(puesto)}${esMano ? ' es-mano' : ''}`,
        'data-puesto': String(puesto),
      },
      h(doc, 'div', { class: 'cartas' }, ...cartas.map((c) => dibujarCarta(doc, c))),
      h(doc, 'span', { class: 'etiqueta' }, `${etiquetaPuesto(puesto)}${esMano ? ' · mano' : ''}`),
    );
  });
  const elemento = h(doc, 'div', { class: 'mesa' }, ...jugadas, h(doc, 'div', { class: 'tapete' }));
  return {
    elemento,
    resaltar(puestos) {
      jugadas.forEach((e, p) => e.classList.toggle('resaltada', puestos.includes(p)));
      elemento.classList.toggle('con-resalte', puestos.length > 0);
    },
    tapar(si) {
      elemento.classList.toggle('tapada', si);
    },
  };
}

/** Pinta "Nosotros"/"Ellos" con el color de su pareja sin cambiar el texto de `lineaLance`. */
function lineaConColores(doc: Document, texto: string): HTMLElement {
  const fila = h(doc, 'span', { class: 'envites' });
  for (const trozo of texto.split(/(Nosotros|Ellos)/)) {
    if (trozo === 'Nosotros' || trozo === 'Ellos') {
      fila.append(h(doc, 'span', { class: `nombre-pareja pareja-${trozo === 'Nosotros' ? 0 : 1}` }, trozo));
    } else if (trozo !== '') {
      fila.append(trozo);
    }
  }
  return fila;
}

function dibujarLances(doc: Document, m: ManoJugada): HTMLElement {
  return h(
    doc,
    'ul',
    { class: 'lances' },
    ...m.lances.map((l) => {
      const linea = lineaLance(l);
      const corte = linea.indexOf(': ');
      return h(
        doc,
        'li',
        {},
        h(doc, 'span', { class: 'nombre-lance' }, linea.slice(0, corte + 1)),
        ' ',
        lineaConColores(doc, linea.slice(corte + 2)),
      );
    }),
  );
}

export function barra(doc: Document, numero: number, total: number, reloj: HTMLElement): HTMLElement {
  return h(
    doc,
    'header',
    { class: 'barra' },
    h(doc, 'span', { class: 'contador' }, `Mano ${numero} / ${total}`),
    reloj,
  );
}

export interface PantallaMano {
  elemento: HTMLElement;
  /** Donde se escribe el tiempo que corre. */
  reloj: HTMLElement;
  tapar(si: boolean): void;
}

export function pantallaMano(
  doc: Document,
  o: {
    numero: number;
    total: number;
    mano: ManoJugada;
    trasAcierto: boolean;
    alComprobar: (respuesta: [number, number]) => void;
  },
): PantallaMano {
  const reloj = h(doc, 'span', { class: 'reloj', 'aria-label': 'Tiempo' }, '0:00');
  const mesa = dibujarMesa(doc, o.mano);
  const cabecera = barra(doc, o.numero, o.total, reloj);
  if (o.trasAcierto) {
    cabecera.append(h(doc, 'span', { class: 'aviso-acierto', 'aria-live': 'polite' }, '✓ Acierto'));
  }
  const elemento = h(
    doc,
    'main',
    { class: 'pantalla pantalla-mano' },
    cabecera,
    mesa.elemento,
    dibujarLances(doc, o.mano),
    crearTeclado(doc, o.alComprobar),
  );
  return { elemento, reloj, tapar: (si) => mesa.tapar(si) };
}
