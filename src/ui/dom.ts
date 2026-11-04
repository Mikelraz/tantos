/** Ayudas mínimas para crear DOM sin framework. Todo se crea con el `Document` inyectado. */

export type Hijo = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  etiqueta: K,
  atributos: Record<string, string> = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const e = doc.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, v);
  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    e.append(hijo);
  }
  return e;
}

const SVG = 'http://www.w3.org/2000/svg';

export function svg(
  doc: Document,
  etiqueta: string,
  atributos: Record<string, string | number> = {},
  ...hijos: Node[]
): SVGElement {
  const e = doc.createElementNS(SVG, etiqueta) as SVGElement;
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, String(v));
  e.append(...hijos);
  return e;
}

export function boton(doc: Document, texto: string, alPulsar: () => void, clase = ''): HTMLButtonElement {
  const b = h(doc, 'button', { type: 'button', class: clase }, texto);
  b.addEventListener('click', alPulsar);
  return b;
}
