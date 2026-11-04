/**
 * La tanda del día: las mismas 10 manos para todos los que juegan esa fecha, sacadas de una semilla
 * que sale de la fecha. No hace falta conexión: basta con que todos tengan la misma versión del
 * generador.
 */
import { generarMano } from '../generar/generar';
import { rngSembrado } from '../generar/rng';
import type { ManoJugada } from '../reglas/contar';
import { NIVELES_TANDA, type Marca } from './tanda';

/** El día de la tanda #1. */
export const DIA_CERO = '2026-11-05';

const MS_DIA = 86_400_000;

/** `AAAA-MM-DD` con la fecha local del móvil: el día cambia a la medianoche de cada uno. */
export function diaDe(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

function utc(dia: string): number {
  const [a, m, d] = dia.split('-').map(Number);
  return Date.UTC(a!, m! - 1, d!);
}

export function numeroDelDia(dia: string): number {
  return Math.round((utc(dia) - utc(DIA_CERO)) / MS_DIA) + 1;
}

/** FNV-1a de 32 bits: una semilla estable a partir del texto del día. */
function semilla(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function manosDelDia(dia: string): ManoJugada[] {
  const rng = rngSembrado(semilla(`tantos:${dia}`));
  return NIVELES_TANDA.map((nivel) => generarMano(nivel, rng));
}

export function tandaDelDia(historial: readonly Marca[], dia: string): Marca | null {
  return historial.find((m) => m.dia === dia) ?? null;
}
