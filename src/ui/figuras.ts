/**
 * Figuras de la baraja española: sota, caballo y rey de cuerpo entero, como en el naipe.
 * Cada figura sostiene el símbolo de su palo, igual que en la baraja de verdad.
 * Todo se dibuja sobre el mismo viewBox que el marco (40×57); la esquina de arriba
 * a la izquierda queda libre para el número.
 */
import type { Rango } from '../reglas/cartas';
import { svg } from './dom';

type Pieza = (doc: Document) => SVGElement[];

const forma = (doc: Document, d: string, clase: string): SVGElement => svg(doc, 'path', { d, class: clase });
const circulo = (doc: Document, cx: number, cy: number, r: number, clase: string): SVGElement =>
  svg(doc, 'circle', { cx, cy, r, class: clase });

/** Un brazo o una pierna: trazo grueso de color con su contorno. */
function miembro(doc: Document, d: string, clase: string, grosor = 3): SVGElement[] {
  return [
    svg(doc, 'path', { d, class: 'f-contorno', style: `stroke-width:${grosor + 1.1}` }),
    svg(doc, 'path', { d, class: `f-trazo ${clase}`, style: `stroke-width:${grosor}` }),
  ];
}

/** El rey: corona, barba y manto largo hasta los pies. */
const rey: Pieza = (doc) => [
  forma(doc, 'M17 20Q24 17.5 31 20L34.5 52.5H13.5Z', 'f-rojo'),
  forma(doc, 'M22.6 19.5H25.4L26.8 52.5H21.2Z', 'f-oro'),
  ...miembro(doc, 'M29.6 21.5Q32.4 26 32.2 31.5', 'f-azul'),
  circulo(doc, 32.2, 32.4, 1.5, 'f-piel'),
  forma(doc, 'M17.6 19.8Q24 24 30.4 19.8Q24 16.6 17.6 19.8Z', 'f-claro'),
  ...miembro(doc, 'M18.8 21.6Q15 24.6 15 30', 'f-azul'),
  circulo(doc, 15, 31, 1.6, 'f-piel'),
  circulo(doc, 24, 13.6, 3.6, 'f-piel'),
  forma(doc, 'M20.5 14.2Q20.8 19.8 24 20.2Q27.2 19.8 27.5 14.2Q24 16.8 20.5 14.2Z', 'f-pelo'),
  forma(doc, 'M19.8 10.8V6.2L22 8.5L24 5.2L26 8.5L28.2 6.2V10.8Z', 'f-oro'),
];

/** El caballo: el jinete montado, con el palo en alto. */
const caballo: Pieza = (doc) => [
  forma(doc, 'M32 34.5Q37 37.5 35.2 46.5', 'f-cola'),
  ...miembro(doc, 'M14 40V51', 'f-caballo', 2.2),
  ...miembro(doc, 'M28.5 40V51', 'f-caballo', 2.2),
  ...miembro(doc, 'M17 40.5Q16.5 45 13 46.5', 'f-caballo', 2.2),
  ...miembro(doc, 'M25.5 41V51', 'f-caballo', 2.2),
  svg(doc, 'ellipse', { cx: 21.5, cy: 37, rx: 11.5, ry: 6, class: 'f-caballo' }),
  forma(doc, 'M11 37L8 27Q8.6 23 12.2 23.6L17.5 33Z', 'f-caballo'),
  forma(doc, 'M8.6 24.4L4.6 30.2Q5 32.2 7 31.8L12 27Z', 'f-caballo'),
  forma(doc, 'M9.6 23.6Q12.6 22.4 14.4 26.4L17.6 32.6', 'f-crin'),
  circulo(doc, 8.6, 26.6, 0.55, 'f-ojo'),
  forma(doc, 'M17.5 31.3H28.3L27.3 39.5H18.3Z', 'f-rojo'),
  ...miembro(doc, 'M22.2 31.5L21 40.5', 'f-azul', 2.6),
  forma(doc, 'M19.6 21.2H26.4L27.4 32H18.6Z', 'f-azul'),
  ...miembro(doc, 'M26 22.6Q30.2 21.6 31 17.8', 'f-azul', 2.4),
  circulo(doc, 31.2, 17.2, 1.3, 'f-piel'),
  circulo(doc, 23, 17.6, 3, 'f-piel'),
  forma(doc, 'M19.2 16.4Q23 10.6 26.8 16.4Z', 'f-rojo'),
];

/** La sota: paje de pie, con gorro de pluma, jubón corto y calzas. */
const sota: Pieza = (doc) => [
  ...miembro(doc, 'M21.8 37V50', 'f-rojo', 2.6),
  ...miembro(doc, 'M26.2 37V50', 'f-oro', 2.6),
  svg(doc, 'ellipse', { cx: 21.4, cy: 51.4, rx: 2.1, ry: 1.1, class: 'f-pelo' }),
  svg(doc, 'ellipse', { cx: 26.6, cy: 51.4, rx: 2.1, ry: 1.1, class: 'f-pelo' }),
  forma(doc, 'M18.4 19.6Q24 17.6 29.6 19.6L31.6 39H16.4Z', 'f-azul'),
  svg(doc, 'rect', { x: 17.4, y: 29, width: 13.2, height: 1.9, class: 'f-oro' }),
  ...miembro(doc, 'M29.2 21.4Q31.4 26 31 30.5', 'f-azul'),
  circulo(doc, 31, 31.4, 1.5, 'f-piel'),
  forma(doc, 'M20.6 19.4Q24 22.4 27.4 19.4Q24 18 20.6 19.4Z', 'f-claro'),
  ...miembro(doc, 'M19 21.4Q15.4 24.4 15.4 29.5', 'f-azul'),
  circulo(doc, 15.4, 30.5, 1.6, 'f-piel'),
  forma(doc, 'M20.4 14.4Q20.2 10.4 24 10.2Q27.8 10.4 27.6 14.4V17Q26.6 13.4 24 13.2Q21.4 13.4 20.4 17Z', 'f-pelo'),
  circulo(doc, 24, 14.2, 3.2, 'f-piel'),
  forma(doc, 'M27.6 9.6Q31 5 34 6.6', 'f-pluma'),
  forma(doc, 'M19.4 11.8Q23.6 6.2 29.6 10.4Q25 13 19.4 11.8Z', 'f-rojo'),
];

const PIEZAS: Partial<Record<Rango, Pieza>> = { 10: sota, 11: caballo, 12: rey };

/** Dónde lleva cada figura su palo (en el viewBox 40×57): en la mano. */
const PALO_EN_MANO: Partial<Record<Rango, { x: number; y: number; lado: number }>> = {
  10: { x: 9.4, y: 24.5, lado: 12 },
  11: { x: 26.4, y: 7, lado: 10.5 },
  12: { x: 9, y: 25, lado: 12 },
};

export function esFigura(r: Rango): boolean {
  return r >= 10;
}

/**
 * Dibuja la figura de ese rango con su palo en la mano. `paloEnMano` es el dibujo del palo
 * (viewBox 20×20); se coloca dentro del de la figura.
 */
export function dibujarFigura(doc: Document, rango: Rango, paloEnMano: SVGElement): SVGElement {
  const pieza = PIEZAS[rango];
  const sitio = PALO_EN_MANO[rango];
  if (!pieza || !sitio) throw new Error(`No es una figura: ${rango}`);
  paloEnMano.setAttribute('x', String(sitio.x));
  paloEnMano.setAttribute('y', String(sitio.y));
  paloEnMano.setAttribute('width', String(sitio.lado));
  paloEnMano.setAttribute('height', String(sitio.lado));
  return svg(
    doc,
    'svg',
    {
      viewBox: '0 0 40 57',
      class: `figura figura-${rango}`,
      'aria-hidden': 'true',
      focusable: 'false',
    },
    ...pieza(doc),
    paloEnMano,
  );
}
