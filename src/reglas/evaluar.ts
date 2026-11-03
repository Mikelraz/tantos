/** Evaluadores por lance. Cada clave se compara solo con otras del mismo lance. */
import { fuerzaRango, totalJugada, type Jugada } from './cartas';

export type Lance = 'grande' | 'chica' | 'pares' | 'juego' | 'punto';

/** Gana la mayor, por comparación lexicográfica. */
export type Clave = readonly number[];

/** Positivo si gana `a`, negativo si gana `b`, cero si empatan. */
export function compararClaves(a: Clave, b: Clave): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function fuerzas(j: Jugada): number[] {
  return j.map((c) => fuerzaRango(c.rango));
}

export function claveGrande(j: Jugada): Clave {
  return fuerzas(j).sort((a, b) => b - a);
}

export function claveChica(j: Jugada): Clave {
  return fuerzas(j)
    .sort((a, b) => a - b)
    .map((f) => -f);
}

/** categoria: 1 pareja, 2 medias, 3 duples. `rangos` en fuerza, de mayor a menor. */
export interface JugadaPares {
  categoria: 1 | 2 | 3;
  rangos: number[];
}

export function clavePares(j: Jugada): JugadaPares | null {
  const cuenta = new Map<number, number>();
  for (const f of fuerzas(j)) cuenta.set(f, (cuenta.get(f) ?? 0) + 1);
  const grupos = [...cuenta.entries()].sort((a, b) => b[0] - a[0]);
  const con = (n: number) => grupos.filter(([, c]) => c === n).map(([f]) => f);

  const cuartetos = con(4);
  const parejas = con(2);
  const trios = con(3);
  if (cuartetos.length > 0) {
    const f = cuartetos[0] as number;
    return { categoria: 3, rangos: [f, f] };
  }
  if (parejas.length === 2) return { categoria: 3, rangos: parejas };
  if (trios.length > 0) return { categoria: 2, rangos: [trios[0] as number] };
  if (parejas.length === 1) return { categoria: 1, rangos: parejas };
  return null;
}

export interface JugadaJuego {
  total: number;
  fuerza: number;
}

/** Orden de mejor a peor: 31 > 32 > 40 > 39 > ... > 33. La real no tiene escalón propio. */
const ORDEN_JUEGO = [31, 32, 40, 39, 38, 37, 36, 35, 34, 33];

export function claveJuego(j: Jugada): JugadaJuego | null {
  const total = totalJugada(j);
  if (total < 31) return null;
  return { total, fuerza: ORDEN_JUEGO.length - ORDEN_JUEGO.indexOf(total) };
}

export function tantosPares(p: JugadaPares): number {
  return p.categoria;
}

export function tantosJuego(g: JugadaJuego): number {
  return g.total === 31 ? 3 : 2;
}
