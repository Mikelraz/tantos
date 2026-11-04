import type { Nivel } from '../generar/generar';
import type { Pareja } from '../reglas/cotejo';
import type { Desglose } from '../reglas/contar';

/** Una tanda son siempre 10 manos, de más fáciles a más difíciles. */
export const NIVELES_TANDA: readonly Nivel[] = [1, 1, 1, 2, 2, 2, 3, 3, 3, 3];

export interface ResultadoMano {
  nivel: Nivel;
  acierto: boolean;
  decimas: number;
}

export interface Marca {
  /** Fecha en ISO 8601. */
  fecha: string;
  fallos: number;
  decimas: number;
  manos: ResultadoMano[];
  /** Tanda jugada con los no queridos cobrados al momento. Las marcas antiguas no lo llevan. */
  noQueridosCobrados?: boolean;
}

export function parejasFalladas(resp: [number, number], d: Desglose): Pareja[] {
  const falladas: Pareja[] = [];
  if (resp[0] !== d.total[0]) falladas.push(0);
  if (resp[1] !== d.total[1]) falladas.push(1);
  return falladas;
}

export function esCorrecta(resp: [number, number], d: Desglose): boolean {
  return parejasFalladas(resp, d).length === 0;
}

export function crearMarca(manos: ResultadoMano[], fecha: Date, noQueridosCobrados: boolean): Marca {
  return {
    fecha: fecha.toISOString(),
    fallos: manos.filter((m) => !m.acierto).length,
    decimas: manos.reduce((s, m) => s + m.decimas, 0),
    manos,
    noQueridosCobrados,
  };
}

/** Negativo si `a` es mejor: menos fallos y, a igualdad, menos décimas. */
export function compararMarcas(a: Marca, b: Marca): number {
  return a.fallos - b.fallos || a.decimas - b.decimas;
}
