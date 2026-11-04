/** Pantalla de solución (versión "Explicada"): veredicto, cartas y un renglón por lance. */
import type { Desglose, ManoJugada } from '../reglas/contar';
import type { Pareja } from '../reglas/cotejo';
import { cartasDecisivas, explicarLance, NOMBRE_LANCE, NOMBRE_PAREJA } from '../juego/textos';
import { parejasFalladas } from '../juego/tanda';
import { boton, h } from './dom';
import { tiempoLargo } from './formato';
import { barra, dibujarMesa } from './mesa';

/** Milisegundos tras mostrarse la solución en que "Siguiente" ignora los toques (doble toque en Comprobar). */
export const GUARDA_SIGUIENTE_MS = 350;

/** Sin abreviar: "Nos." obligaba a adivinar y apenas ahorraba ancho. */
const CABECERA_PAREJA = NOMBRE_PAREJA;

/** Cuatro números seguidos: una jugada escrita carta a carta ("12 11 10 6"), en grande y chica. */
const JUGADA_EN_TEXTO = /(\d{1,2}(?: \d{1,2}){3})/;

const SEPARADOR = ' · ';
/** Hasta este largo un trozo de la explicación ("en paso 1", "punto 1") no se parte en dos líneas. */
const TROZO_CORTO = 20;

/** La explicación con cada jugada en su propio bloque, para no confundir las dos que se comparan. */
function explicacion(doc: Document, texto: string): HTMLElement {
  const e = h(doc, 'span', { class: 'porque' });
  texto.split(SEPARADOR).forEach((parte, n) => {
    if (n > 0) e.append(SEPARADOR);
    if (parte.length <= TROZO_CORTO) {
      e.append(h(doc, 'span', { class: 'entero' }, ...trozosConJugadas(doc, parte)));
    } else {
      e.append(...trozosConJugadas(doc, parte));
    }
  });
  return e;
}

function trozosConJugadas(doc: Document, texto: string): Array<HTMLElement | string> {
  // Con un grupo en la expresión, `split` deja las coincidencias en las posiciones impares.
  return texto
    .split(JUGADA_EN_TEXTO)
    .map((trozo, i) => (i % 2 === 1 ? h(doc, 'span', { class: 'jugada-texto' }, trozo) : trozo))
    .filter((t) => t !== '');
}

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
    h(doc, 'b', {}, 'Fallo'),
    `: has puesto ${r[0]} – ${r[1]} y era `,
    h(doc, 'b', { class: 'correcto' }, `${d.total[0]} – ${d.total[1]}`),
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
        explicacion(doc, explicarLance(c, mano)),
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
    // La pista va con la tabla a la que se refiere, no flotando entre la mesa y la tabla.
    h(doc, 'caption', { class: 'pista' }, 'Toca un lance para ver qué cartas lo deciden.'),
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
