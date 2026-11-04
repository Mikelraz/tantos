/** Pantalla de fin de tanda: fallos, tiempo, comparación con la mejor marca y evolución. */
import type { Marca } from '../juego/tanda';
import { boton, h } from './dom';
import { textoMarca, tiempoLargo } from './formato';
import { graficaMarcas } from './grafica';

export function pantallaFin(
  doc: Document,
  o: {
    marca: Marca;
    nuevaMejor: boolean;
    /** La mejor marca antes de esta tanda. */
    mejorPrevia: Marca | null;
    /** Historial con esta tanda al final. */
    serie: readonly Marca[];
    alOtra: () => void;
    /** En la tanda del día: su número y el botón de compartir. */
    delDia: { numero: number; compartir: HTMLButtonElement } | null;
  },
): HTMLElement {
  const { marca } = o;
  const dato = (nombre: string, titulo: string, valor: string): HTMLElement =>
    h(
      doc,
      'div',
      { class: `dato dato-${nombre}` },
      h(doc, 'span', { class: 'titulo' }, titulo),
      h(doc, 'span', { class: 'valor', 'data-dato': nombre }, valor),
    );

  const comparacion = o.nuevaMejor
    ? h(
        doc,
        'p',
        { class: 'record' },
        'Nueva mejor marca',
        o.mejorPrevia ? h(doc, 'span', { class: 'antes' }, `antes: ${textoMarca(o.mejorPrevia)}`) : null,
      )
    : o.mejorPrevia
      ? h(doc, 'p', { class: 'mejor' }, `Mejor marca: ${textoMarca(o.mejorPrevia)}`)
      : null;

  const manos = h(
    doc,
    'ol',
    { class: 'manos', 'aria-label': 'Manos de la tanda' },
    ...marca.manos.map((m, i) =>
      h(
        doc,
        'li',
        { class: m.acierto ? 'acierto' : 'fallo', title: `Mano ${i + 1}, nivel ${m.nivel}` },
        h(doc, 'span', { class: 'numero' }, String(i + 1)),
        h(doc, 'span', { class: 'tiempo' }, tiempoLargo(m.decimas)),
      ),
    ),
  );

  return h(
    doc,
    'main',
    { class: 'pantalla pantalla-fin' },
    h(doc, 'h1', {}, o.delDia ? `Tanda del día #${o.delDia.numero}` : 'Tanda terminada'),
    h(
      doc,
      'div',
      { class: 'datos' },
      dato('fallos', 'Fallos', String(marca.fallos)),
      dato('tiempo', 'Tiempo', tiempoLargo(marca.decimas)),
    ),
    comparacion,
    manos,
    graficaMarcas(doc, o.serie),
    o.delDia?.compartir,
    boton(doc, 'Otra tanda', o.alOtra, o.delDia ? 'secundario' : 'principal'),
  );
}
