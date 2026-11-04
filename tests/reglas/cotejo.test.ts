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
  it.each([
    [0, 0],
    [1, 1],
    [2, 0],
    [3, 0],
  ])('la real 7 7 7 S (pareja 0) contra un 31 normal (pareja 1), mano %i gana %i', (mano, esperado) => {
    // 7+7+7+10 = 31 con la real incluida; R C S 1 = 31 ordinario. No hay escalón propio para la real.
    const js: Jugadas = [jugada('7 7 7 S'), jugada('R C S 1'), jugada('1 2 3 4'), jugada('1 1 2 4')];
    const p = participantes('juego', js, mano);
    expect([...p].sort()).toEqual([0, 1]);
    expect(ganadorCotejo('juego', js, p, mano)).toBe(esperado);
  });
});
