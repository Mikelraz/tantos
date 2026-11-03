/** Cartas de la baraja española (mus de cuatro reyes). Los rangos usan los valores de ordago. */

export type Rango = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;
/** 0 oros, 1 copas, 2 espadas, 3 bastos. */
export type Palo = 0 | 1 | 2 | 3;

export interface Carta {
  readonly rango: Rango;
  readonly palo: Palo;
}

export type Jugada = readonly [Carta, Carta, Carta, Carta];

export const RANGOS: readonly Rango[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const PALOS: readonly Palo[] = [0, 1, 2, 3];

export function baraja(): Carta[] {
  return RANGOS.flatMap((rango) => PALOS.map((palo) => ({ rango, palo })));
}

/** Valor para juego y punto: las figuras valen 10. */
export function valorCarta(r: Rango): number {
  return r >= 10 ? 10 : r;
}

/** Fuerza ordinal para grande, chica y pares: As 1 ... Rey 10. */
export function fuerzaRango(r: Rango): number {
  return r >= 10 ? r - 2 : r;
}

export function totalJugada(j: Jugada): number {
  return j.reduce((suma, c) => suma + valorCarta(c.rango), 0);
}

const SIMBOLOS: Record<string, Rango> = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  S: 10, C: 11, R: 12,
};

/** Ayuda para pruebas: `jugada("R R 7 5")`. Los palos se asignan rotando. */
export function jugada(texto: string): Jugada {
  const simbolos = texto.trim().split(/\s+/);
  if (simbolos.length !== 4) throw new Error(`Una jugada tiene cuatro cartas: "${texto}"`);
  const cartas = simbolos.map((s, i): Carta => {
    const rango = SIMBOLOS[s];
    if (rango === undefined) throw new Error(`Símbolo de carta desconocido: "${s}"`);
    return { rango, palo: (i % 4) as Palo };
  });
  return cartas as unknown as Jugada;
}
