/** Cotejo de un lance: quién juega y quién gana. Los empates los decide la mano. */
import { totalJugada, type Jugada } from './cartas';
import {
  claveChica,
  claveGrande,
  clavePares,
  claveJuego,
  compararClaves,
  type Clave,
  type Lance,
} from './evaluar';

/** Pareja 0: asientos 0 y 2. Pareja 1: asientos 1 y 3. */
export type Pareja = 0 | 1;

/** Jugadas indexadas por asiento. */
export type Jugadas = readonly [Jugada, Jugada, Jugada, Jugada];

export function parejaDe(puesto: number): Pareja {
  return (puesto % 2) as Pareja;
}

export function companeros(p: Pareja): [number, number] {
  return p === 0 ? [0, 2] : [1, 3];
}

/** Asientos en orden de palabra: la mano y los que le siguen. */
export function ordenDesdeMano(mano: number): number[] {
  return [0, 1, 2, 3].map((k) => (mano + k) % 4);
}

/** Los cuatro lances; el último es `punto` si nadie tiene juego. */
export function lancesDeLaMano(jugadas: Jugadas): Lance[] {
  const hayJuego = jugadas.some((j) => claveJuego(j) !== null);
  return ['grande', 'chica', 'pares', hayJuego ? 'juego' : 'punto'];
}

/** `null` si la jugada no califica para el lance. */
export function claveLance(lance: Lance, j: Jugada): Clave | null {
  switch (lance) {
    case 'grande':
      return claveGrande(j);
    case 'chica':
      return claveChica(j);
    case 'pares': {
      const p = clavePares(j);
      return p === null ? null : [p.categoria, ...p.rangos];
    }
    case 'juego': {
      const g = claveJuego(j);
      return g === null ? null : [g.fuerza];
    }
    case 'punto':
      return [totalJugada(j)];
  }
}

/** Quién juega el lance, en orden desde la mano. */
export function participantes(lance: Lance, jugadas: Jugadas, mano: number): number[] {
  return ordenDesdeMano(mano).filter((s) => claveLance(lance, jugadas[s] as Jugada) !== null);
}

/** Asiento ganador; con claves iguales gana el primero en el orden desde la mano. */
export function ganadorCotejo(
  lance: Lance,
  jugadas: Jugadas,
  participantes: number[],
  mano: number,
): number {
  const orden = ordenDesdeMano(mano);
  const ordenados = [...participantes].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  let mejor = ordenados[0] as number;
  let claveMejor = claveLance(lance, jugadas[mejor] as Jugada) as Clave;
  for (const s of ordenados.slice(1)) {
    const clave = claveLance(lance, jugadas[s] as Jugada) as Clave;
    if (compararClaves(clave, claveMejor) > 0) {
      mejor = s;
      claveMejor = clave;
    }
  }
  return mejor;
}
