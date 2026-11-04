/** Pantalla de solución (versión "Explicada"): veredicto, cartas y un renglón por lance. */
import type { Desglose, ManoJugada } from '../reglas/contar';
import type { Pareja } from '../reglas/cotejo';
import { cartasDecisivas, explicarLance, NOMBRE_LANCE } from '../juego/textos';
import { parejasFalladas } from '../juego/tanda';
import { boton, h } from './dom';
import { tiempoLargo } from './formato';
import { barra, dibujarMesa } from './mesa';

/** Milisegundos tras mostrarse la solución en que "Siguiente" ignora los toques (doble toque en Comprobar). */
export const GUARDA_SIGUIENTE_MS = 350;

const CABECERA_PAREJA = ['Nos.', 'Ellos'] as const;

function celda(doc: Document, p: Pareja, falladas: Pareja[], valor: string, cabecera = false): HTMLElement {
  const clase = `col-${p}${falladas.includes(p) ? ' fallo' : ''}`;
  return cabecera ? h(doc, 'th', { class: clase, scope: 'col' }, valor) : h(doc, 'td', { class: clase }, valor);
}

export function pantallaSolucion(
  doc: Document,
  o: {
    numero: number;
    total: number;
    mano: ManoJugada;
    desglose: Desglose;
    respuesta: [number, number];
    decimas: number;
    alSeguir: () => void;
    ahora: () => number;
  },
): HTMLElement {
  const { mano, desglose: d, respuesta: r } = o;
  const falladas = parejasFalladas(r, d);
  const mesa = dibujarMesa(doc, mano);
  const mostradaEn = o.ahora();

  const veredicto = h(
    doc,
    'p',
    { class: 'veredicto', role: 'status' },
    `Fallo · tú: ${r[0]} – ${r[1]} · era: `,
    h(doc, 'b', {}, `${d.total[0]} – ${d.total[1]}`),
  );

  let activa: HTMLElement | null = null;
  const filas = d.lances.map((c, i) => {
    const fila = h(
      doc,
      'tr',
      { 'data-lance': String(i), tabindex: '0' },
      h(
        doc,
        'td',
        { class: 'lance' },
        NOMBRE_LANCE[c.lance],
        h(doc, 'span', { class: 'porque' }, explicarLance(c, mano)),
      ),
      ...([0, 1] as const).map((p) => {
        const n = c.apuesta[p] + c.tantos[p];
        return celda(doc, p, falladas, n === 0 ? '' : String(n));
      }),
    );
    const elegir = (): void => {
      const misma = activa === fila;
      activa?.classList.remove('activa');
      activa = misma ? null : fila;
      activa?.classList.add('activa');
      mesa.resaltar(misma ? [] : cartasDecisivas(c));
    };
    fila.addEventListener('click', elegir);
    fila.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        elegir();
      }
    });
    return fila;
  });

  const tabla = h(
    doc,
    'table',
    { class: 'desglose' },
    h(
      doc,
      'thead',
      {},
      h(
        doc,
        'tr',
        {},
        h(doc, 'th', { scope: 'col' }, 'Lance'),
        ...([0, 1] as const).map((p) => celda(doc, p, falladas, CABECERA_PAREJA[p], true)),
      ),
    ),
    h(doc, 'tbody', {}, ...filas),
    h(
      doc,
      'tfoot',
      {},
      h(
        doc,
        'tr',
        { class: 'total' },
        h(doc, 'td', {}, 'Total'),
        ...([0, 1] as const).map((p) => celda(doc, p, falladas, String(d.total[p]))),
      ),
    ),
  );

  const reloj = h(doc, 'span', { class: 'reloj parado', 'aria-label': 'Tiempo de la mano' }, tiempoLargo(o.decimas));
  return h(
    doc,
    'main',
    { class: 'pantalla pantalla-solucion' },
    barra(doc, o.numero, o.total, reloj),
    veredicto,
    mesa.elemento,
    h(doc, 'p', { class: 'pista' }, 'Toca un lance para ver qué cartas lo deciden.'),
    tabla,
    boton(
      doc,
      'Siguiente',
      () => {
        if (o.ahora() - mostradaEn >= GUARDA_SIGUIENTE_MS) o.alSeguir();
      },
      'principal',
    ),
  );
}
