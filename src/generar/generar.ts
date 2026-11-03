/** Generador de manos terminadas según el nivel: cuántos lances se envidan y cómo. */
import { baraja, type Carta } from '../reglas/cartas';
import { jugarLance, type Accion, type EstadoApuesta } from '../reglas/apuestas';
import {
  ganadorCotejo,
  lancesDeLaMano,
  parejaDe,
  participantes,
  type Jugadas,
} from '../reglas/cotejo';
import type { Lance } from '../reglas/evaluar';
import type { LanceJugado, ManoJugada } from '../reglas/contar';
import type { Rng } from './rng';

export type Nivel = 1 | 2 | 3;

/** Probabilidad de que abra la pareja que gana el cotejo (para que la mano resulte creíble). */
const P_ABRE_GANADOR = 0.7;

type Fuerza = 'normal' | 'subida' | 'ordago';

/** Guion de un lance envidado. `abre` es la posición del que abre entre los participantes. */
interface Guion {
  abre: number;
  apertura: number;
  fuerza: Fuerza;
  /** Para `subida`: N en "N más". */
  subida: number;
  /** ¿Se quiere al final? Siempre falso con órdago: nunca se quiere un órdago. */
  quiero: boolean;
}

function entero(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function mezclar<T>(xs: readonly T[], rng: Rng): T[] {
  const r = [...xs];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [r[i], r[j]] = [r[j] as T, r[i] as T];
  }
  return r;
}

/**
 * Elige quién abre: primero la pareja (la del ganador del cotejo con un 70 %), luego el
 * asiento como el primero de esa pareja a partir de una posición al azar entre los tres
 * primeros que hablan. Si la pareja elegida no habla en esos tres, abre la otra.
 */
function elegirApertura(quienes: number[], ganador: number, rng: Rng): number {
  const ventana = Math.min(3, quienes.length);
  const pareja = rng() < P_ABRE_GANADOR ? parejaDe(ganador) : 1 - parejaDe(ganador);
  const desde = entero(rng, 0, ventana - 1);
  for (const objetivo of [pareja, 1 - pareja]) {
    for (let k = 0; k < ventana; k++) {
      const i = (desde + k) % ventana;
      if (parejaDe(quienes[i] as number) === objetivo) return i;
    }
  }
  return desde;
}

function guionar(fuerza: Fuerza, quienes: number[], ganador: number, rng: Rng): Guion {
  return {
    abre: elegirApertura(quienes, ganador, rng),
    apertura: entero(rng, 2, 5),
    fuerza,
    subida: entero(rng, 2, 5),
    quiero: fuerza === 'ordago' ? false : rng() < 0.5,
  };
}

/** Traduce el guion a decisiones; la legalidad la garantiza `jugarLance`. */
function elegirGuionizado(g: Guion): (e: EstadoApuesta) => Accion {
  return (e) => {
    const n = e.historial.length;
    if (e.pendiente === 0) {
      if (n < g.abre) return { tipo: 'paso' };
      return g.fuerza === 'ordago'
        ? { tipo: 'ordago' }
        : { tipo: 'envido', cantidad: g.apertura };
    }
    if (g.fuerza === 'subida' && n === g.abre + 1) {
      return { tipo: 'envido', cantidad: e.pendiente + g.subida };
    }
    return g.quiero ? { tipo: 'quiero' } : { tipo: 'no_quiero' };
  };
}

function lanceEnvidado(
  lance: Lance,
  jugadas: Jugadas,
  mano: number,
  fuerza: Fuerza,
  rng: Rng,
): LanceJugado {
  const quienes = participantes(lance, jugadas, mano);
  const ganador = ganadorCotejo(lance, jugadas, quienes, mano);
  const guion = guionar(fuerza, quienes, ganador, rng);
  return { lance, historial: jugarLance(quienes, elegirGuionizado(guion)).historial };
}

function lanceEnPaso(lance: Lance, jugadas: Jugadas, mano: number): LanceJugado {
  const quienes = participantes(lance, jugadas, mano);
  return { lance, historial: jugarLance(quienes, () => ({ tipo: 'paso' })).historial };
}

export function generarMano(nivel: Nivel, rng: Rng): ManoJugada {
  const cartas: Carta[] = mezclar(baraja(), rng);
  const jugadas = [0, 1, 2, 3].map((s) => cartas.slice(s * 4, s * 4 + 4)) as unknown as Jugadas;
  const mano = entero(rng, 0, 3);
  const lances = lancesDeLaMano(jugadas);

  // Envidable: participan las dos parejas.
  const envidables = lances.filter(
    (l) => new Set(participantes(l, jugadas, mano).map(parejaDe)).size === 2,
  );

  // Fuerza de cada lance envidado elegido; el resto va en paso.
  const fuerzas = new Map<Lance, Fuerza>();
  if (nivel >= 2) {
    const cuantos = Math.min(entero(rng, 1, nivel === 2 ? 2 : 3), envidables.length);
    const elegidos = mezclar(envidables, rng).slice(0, cuantos);
    for (const l of elegidos) fuerzas.set(l, 'normal');
    if (nivel === 3) fuerzas.set(elegidos[0] as Lance, rng() < 0.7 ? 'subida' : 'ordago');
  }

  return {
    jugadas,
    mano,
    lances: lances.map((l) => {
      const f = fuerzas.get(l);
      return f === undefined ? lanceEnPaso(l, jugadas, mano) : lanceEnvidado(l, jugadas, mano, f, rng);
    }),
  };
}
