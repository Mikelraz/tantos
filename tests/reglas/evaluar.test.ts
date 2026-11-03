import { describe, expect, it } from 'vitest';
import { jugada, totalJugada } from '../../src/reglas/cartas';
import {
  claveChica,
  claveGrande,
  claveJuego,
  clavePares,
  compararClaves,
  tantosJuego,
  tantosPares,
  type JugadaPares,
} from '../../src/reglas/evaluar';

const gana = (a: JugadaPares, b: JugadaPares) =>
  compararClaves([a.categoria, ...a.rangos], [b.categoria, ...b.rangos]) > 0;
const par = (t: string) => clavePares(jugada(t)) as JugadaPares;

describe('totales', () => {
  it('suma con figuras a 10', () => {
    expect(totalJugada(jugada('R C S 1'))).toBe(31);
    expect(totalJugada(jugada('7 7 S 4'))).toBe(28);
  });
});

describe('grande y chica', () => {
  it('grande', () => {
    expect(compararClaves(claveGrande(jugada('R R 7 5')), claveGrande(jugada('R C S 1')))).toBeGreaterThan(0);
  });
  it('chica: empatan en el 1, decide el 4 frente a la S', () => {
    expect(compararClaves(claveChica(jugada('C S 4 1')), claveChica(jugada('R C S 1')))).toBeGreaterThan(0);
  });
});

describe('pares', () => {
  it('sin pares', () => expect(clavePares(jugada('R C S 1'))).toBeNull());
  it('pareja, medias, duples', () => {
    expect(par('R R 7 5')).toEqual({ categoria: 1, rangos: [10] });
    expect(par('7 7 7 4').categoria).toBe(2);
    expect(par('R R 7 7')).toEqual({ categoria: 3, rangos: [10, 7] });
    expect(par('R R R R')).toEqual({ categoria: 3, rangos: [10, 10] });
  });
  it('orden entre categorías', () => {
    expect(gana(par('R R R R'), par('R R C C'))).toBe(true);
    expect(gana(par('2 2 3 3'), par('R R R 4'))).toBe(true);
    expect(gana(par('R R R 4'), par('R R 7 5'))).toBe(true);
  });
  it('con cuatro reyes, 3 3 2 2 son duples de treses y doses', () => {
    expect(par('3 3 2 2')).toEqual({ categoria: 3, rangos: [3, 2] });
  });
  it('tantos', () => expect(tantosPares(par('7 7 7 4'))).toBe(2));
});

describe('juego', () => {
  const g = (t: string) => claveJuego(jugada(t))!;
  it('orden 31 > 32 > 40 > 33', () => {
    expect(g('R C S 1').fuerza).toBeGreaterThan(g('R R 7 5').fuerza);
    expect(g('R R 7 5').fuerza).toBeGreaterThan(g('R R C S').fuerza);
    expect(g('R R C S').fuerza).toBeGreaterThan(g('R C S 3').fuerza);
  });
  it('sin juego', () => expect(claveJuego(jugada('7 7 S 4'))).toBeNull());
  it('la real no tiene escalón propio', () => {
    expect(g('7 7 7 S').fuerza).toBe(g('R C S 1').fuerza);
  });
  it('tantos', () => {
    expect(tantosJuego(g('R C S 1'))).toBe(3);
    expect(tantosJuego(g('R R 7 5'))).toBe(2);
  });
});
