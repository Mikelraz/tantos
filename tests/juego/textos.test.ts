import { describe, expect, it } from 'vitest';
import { jugada } from '../../src/reglas/cartas';
import type { Intervencion } from '../../src/reglas/apuestas';
import { contarMano, type LanceJugado, type ManoJugada } from '../../src/reglas/contar';
import {
  cartasDecisivas,
  etiquetaPuesto,
  explicarLance,
  lineaLance,
  posicionEnPantalla,
  simbolo,
} from '../../src/juego/textos';

const env = (puesto: number, cantidad: number): Intervencion => ({
  puesto,
  accion: { tipo: 'envido', cantidad },
});
const paso = (puesto: number): Intervencion => ({ puesto, accion: { tipo: 'paso' } });
const quiero = (puesto: number): Intervencion => ({ puesto, accion: { tipo: 'quiero' } });
const noQuiero = (puesto: number): Intervencion => ({ puesto, accion: { tipo: 'no_quiero' } });
const l = (lance: LanceJugado['lance'], ...historial: Intervencion[]): LanceJugado => ({
  lance,
  historial,
});

const pasan = (lance: LanceJugado['lance']): LanceJugado =>
  l(lance, paso(0), paso(1), paso(2), paso(3));

const mano: ManoJugada = {
  jugadas: [jugada('R R 7 5'), jugada('C S 4 1'), jugada('7 7 S 4'), jugada('R C S 1')],
  mano: 0,
  lances: [
    l('grande', env(0, 2), quiero(1)),
    l('chica', paso(0), env(1, 2), noQuiero(2)),
    l('pares'),
    l('juego', env(0, 2), quiero(3)),
  ],
};
const d = contarMano(mano);
const [g, c, p, j] = d.lances as [
  (typeof d.lances)[0],
  (typeof d.lances)[0],
  (typeof d.lances)[0],
  (typeof d.lances)[0],
];

describe('lineaLance', () => {
  it('resume las intervenciones sin los pasos', () => {
    expect(lineaLance(mano.lances[0] as LanceJugado)).toBe('Grande: Nosotros envido 2 · Ellos quiero');
    expect(lineaLance(mano.lances[1] as LanceJugado)).toBe('Chica: Ellos envido 2 · Nosotros no quiero');
    expect(lineaLance(mano.lances[2] as LanceJugado)).toBe('Pares: sin envite');
  });
  it('una subida dice cuánto más', () => {
    expect(lineaLance(l('juego', env(0, 2), env(1, 7), noQuiero(2)))).toBe(
      'Juego: Nosotros envido 2 · Ellos 5 más · Nosotros no quiero',
    );
  });
  it('un órdago es órdago', () => {
    expect(lineaLance(l('grande', { puesto: 0, accion: { tipo: 'ordago' } }, noQuiero(1)))).toBe(
      'Grande: Nosotros órdago · Ellos no quiero',
    );
  });
  it('pares sin_rival y sin_participantes no tienen envite', () => {
    const solo: ManoJugada = {
      jugadas: [jugada('R R 7 5'), jugada('C S 4 1'), jugada('7 7 S 4'), jugada('6 4 3 1')],
      mano: 0,
      lances: [pasan('grande'), pasan('chica'), l('pares'), pasan('punto')],
    };
    expect(lineaLance(solo.lances[2] as LanceJugado)).toBe('Pares: sin envite');
    const nadie: ManoJugada = {
      jugadas: [jugada('R 7 5 1'), jugada('C 4 3 1'), jugada('6 5 2 1'), jugada('6 4 3 1')],
      mano: 0,
      lances: [pasan('grande'), pasan('chica'), l('pares'), pasan('punto')],
    };
    expect(lineaLance(nadie.lances[2] as LanceJugado)).toBe('Pares: sin envite');
  });
});

describe('explicarLance', () => {
  it('explica el ejemplo de los bocetos', () => {
    expect(explicarLance(g, mano)).toBe('RR75 gana a RCS1 · envite querido 2');
    expect(explicarLance(c, mano)).toBe('no quiero → 1');
    expect(explicarLance(p, mano)).toBe('solo Nosotros · pareja de R 1 + pareja de 7 1');
    expect(explicarLance(j, mano)).toBe('31 gana a 32 · envite querido 2 · 31 vale 3');
  });
  it('la chica se compara de menor a mayor', () => {
    const m: ManoJugada = { ...mano, lances: [pasan('grande'), pasan('chica'), l('pares'), l('juego', env(0, 2), quiero(3))] };
    expect(explicarLance(contarMano(m).lances[1] as typeof g, m)).toBe('14SC gana a 477S · en paso 1');
  });
  it('nadie tiene pares', () => {
    const m: ManoJugada = {
      jugadas: [jugada('R 7 5 1'), jugada('C 4 3 1'), jugada('6 5 2 1'), jugada('6 4 3 1')],
      mano: 0,
      lances: [pasan('grande'), pasan('chica'), l('pares'), pasan('punto')],
    };
    expect(explicarLance(contarMano(m).lances[2] as typeof g, m)).toBe('nadie tiene pares');
  });
  it('el punto en paso solo paga el tanto y marca el empate', () => {
    const m: ManoJugada = {
      jugadas: [jugada('R 7 5 1'), jugada('C 4 3 1'), jugada('6 5 2 1'), jugada('6 4 3 1')],
      mano: 0,
      lances: [pasan('grande'), pasan('chica'), l('pares'), pasan('punto')],
    };
    const cobro = contarMano(m).lances[3] as typeof g;
    expect(explicarLance(cobro, m)).toBe('punto 23 gana a punto 18 · punto 1');
    const empate: ManoJugada = {
      jugadas: [jugada('R 7 5 1'), jugada('R 7 5 1'), jugada('6 5 2 1'), jugada('6 4 3 1')],
      mano: 0,
      lances: [pasan('grande'), pasan('chica'), l('pares'), pasan('punto')],
    };
    expect(explicarLance(contarMano(empate).lances[0] as typeof g, empate)).toContain(
      '(empate: más cerca de la mano)',
    );
  });
});

describe('mesa', () => {
  it('coloca los asientos en sentido antihorario', () => {
    expect([0, 1, 2, 3].map(posicionEnPantalla)).toEqual(['abajo', 'derecha', 'arriba', 'izquierda']);
    expect([0, 1, 2, 3].map(etiquetaPuesto)).toEqual(['Tú', 'Rival', 'Compañero', 'Rival']);
    expect(simbolo({ rango: 10, palo: 0 })).toBe('S');
  });
  it('cartasDecisivas une ganador y tantos sin repetir', () => {
    expect(cartasDecisivas(j)).toEqual([3]);
    expect(cartasDecisivas(p)).toEqual([0, 2]);
    expect(cartasDecisivas(g)).toEqual([0]);
  });
});
