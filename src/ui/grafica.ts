/** Gráfica de la evolución: el tiempo de las últimas tandas, con las de 0 fallos destacadas. */
import type { Marca } from '../juego/tanda';
import { h, svg } from './dom';
import { textoFallos, tiempoCorto } from './formato';

export const MARCAS_EN_GRAFICA = 20;

const ANCHO = 320;
const ALTO = 140;
const IZQ = 40;
const DER = 12;
const ARR = 12;
const ABA = 16;
/** Separación entre el eje y el primer punto. */
const MARGEN = 12;

/** `todas` no puede estar vacía. */
export function graficaMarcas(doc: Document, todas: readonly Marca[]): HTMLElement {
  const marcas = todas.slice(-MARCAS_EN_GRAFICA);
  const tiempos = marcas.map((m) => m.decimas);
  const max = Math.max(...tiempos);
  const min = Math.min(...tiempos);
  const rango = max - min || 1;

  const x = (i: number): number =>
    marcas.length === 1
      ? (IZQ + ANCHO - DER) / 2
      : IZQ + MARGEN + (i * (ANCHO - IZQ - MARGEN - DER)) / (marcas.length - 1);
  // Más rápido, más abajo.
  const y = (d: number): number =>
    max === min ? (ARR + ALTO - ABA) / 2 : ALTO - ABA - ((d - min) / rango) * (ALTO - ARR - ABA);

  const eje = (d: number): SVGElement => {
    const t = svg(doc, 'text', { x: IZQ - 6, y: y(d) + 4, class: 'eje', 'text-anchor': 'end' });
    t.textContent = tiempoCorto(d);
    return t;
  };

  const puntos = marcas.map((m, i) => {
    const ultima = i === marcas.length - 1;
    const c = svg(doc, 'circle', {
      cx: x(i),
      cy: y(m.decimas),
      r: ultima ? 6 : 4.5,
      class: `punto${m.fallos === 0 ? ' limpia' : ''}${ultima ? ' actual' : ''}`,
    });
    const titulo = svg(doc, 'title');
    titulo.textContent = `${textoFallos(m.fallos)} · ${tiempoCorto(m.decimas)}`;
    c.append(titulo);
    return c;
  });

  const grafica = svg(
    doc,
    'svg',
    { viewBox: `0 0 ${ANCHO} ${ALTO}`, class: 'grafica', role: 'img', 'aria-label': 'Tiempo de las últimas tandas' },
    svg(doc, 'line', { x1: IZQ, y1: ARR, x2: IZQ, y2: ALTO - ABA, class: 'guia' }),
    svg(doc, 'line', { x1: IZQ, y1: ALTO - ABA, x2: ANCHO - DER, y2: ALTO - ABA, class: 'guia' }),
    eje(max),
    ...(max === min ? [] : [eje(min)]),
    ...(marcas.length > 1
      ? [svg(doc, 'polyline', { points: marcas.map((m, i) => `${x(i)},${y(m.decimas)}`).join(' '), class: 'traza' })]
      : []),
    ...puntos,
  );

  return h(
    doc,
    'figure',
    { class: 'evolucion' },
    h(doc, 'figcaption', {}, 'Evolución del tiempo'),
    grafica,
    h(
      doc,
      'p',
      { class: 'leyenda' },
      h(doc, 'span', { class: 'muestra limpia' }),
      ' 0 fallos ',
      h(doc, 'span', { class: 'muestra' }),
      ' con fallos',
    ),
  );
}
