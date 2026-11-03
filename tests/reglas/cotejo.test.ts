import { describe, expect, it } from 'vitest';
import { jugada } from '../../src/reglas/cartas';
import {
  companeros,
  ganadorCotejo,
  lancesDeLaMano,
  ordenDesdeMano,
  parejaDe,
  participantes,
  type Jugadas,
} from '../../src/reglas/cotejo';

const sinJuego: Jugadas = [jugada('1 2 3 4'), jugada('1 1 2 4'), jugada('1 2 3 5'), jugada('1 2 4 5')];

describe('parejas y orden', () => {
  it('asigna parejas 0+2 y 1+3', () => {
    expect([0, 1, 2, 3].map(parejaDe)).toEqual([0, 1, 0, 1]);
    expect(companeros(0)).toEqual([0, 2]);
    expect(companeros(1)).toEqual([1, 3]);
  });
  it('ordena desde la mano', () => {
    expect(ordenDesdeMano(2)).toEqual([2, 3, 0, 1]);
    expect(ordenDesdeMano(0)).toEqual([0, 1, 2, 3]);
  });
});

describe('lancesDeLaMano', () => {
  it('termina en punto si nadie llega a 31', () => {
    expect(lancesDeLaMano(sinJuego)).toEqual(['grande', 'chica', 'pares', 'punto']);
  });
  it('termina en juego si alguien llega', () => {
    const js: Jugadas = [sinJuego[0], jugada('R R 7 5'), sinJuego[2], sinJuego[3]];
    expect(lancesDeLaMano(js)).toEqual(['grande', 'chica', 'pares', 'juego']);
  });
});

describe('participantes', () => {
  const js: Jugadas = [jugada('R R 7 5'), jugada('R 5 4 2'), jugada('C C C 1'), jugada('S S 6 3')];
  it('en grande, chica y punto juegan los cuatro, desde la mano', () => {
    expect(participantes('grande', js, 2)).toEqual([2, 3, 0, 1]);
    expect(participantes('chica', js, 0)).toEqual([0, 1, 2, 3]);
    expect(participantes('punto', js, 1)).toEqual([1, 2, 3, 0]);
  });
  it('en pares deja fuera a quien no tiene, respetando la mano', () => {
    expect(participantes('pares', js, 2)).toEqual([2, 3, 0]);
  });
  it('en juego solo quien lo tiene', () => {
    expect(participantes('juego', js, 3)).toEqual([0, 2]);
  });
});

describe('ganadorCotejo (desempate por la mano)', () => {
  const igual = jugada('R R 7 5');
  const js: Jugadas = [jugada('1 2 3 4'), igual, igual, jugada('1 2 3 5')];
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 1],
  ])('grande idéntica en 1 y 2, mano %i gana %i', (mano, esperado) => {
    expect(ganadorCotejo('grande', js, participantes('grande', js, mano), mano)).toBe(esperado);
  });
  it('dos 31, la real incluida, con la mano en 3 gana el más cercano a 3', () => {
    const j31: Jugadas = [jugada('R R 7 5'), jugada('1 2 3 4'), jugada('R C 6 5'), jugada('1 1 2 4')];
    // 0: 10+10+7+5=32; usamos 31 reales: R R 7 4 y C S 6 5
    const dos: Jugadas = [jugada('R R 7 4'), j31[1], jugada('C S 6 5'), j31[3]];
    const p = participantes('juego', dos, 3);
    expect(p).toEqual([0, 2]);
    expect(ganadorCotejo('juego', dos, p, 3)).toBe(0);
  });
});
