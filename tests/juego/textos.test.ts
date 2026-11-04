import { describe, expect, it } from 'vitest';
import { jugada } from '../../src/reglas/cartas';
import type { Jugadas } from '../../src/reglas/cotejo';
import type { Intervencion } from '../../src/reglas/apuestas';
import { contarMano, type LanceJugado, type ManoJugada } from '../../src/reglas/contar';
import {
  cartasDecisivas,
  dichos,
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
    expect(explicarLance(g, mano)).toBe('12 12 7 5 gana a 12 11 10 1 · envite querido 2');
    expect(explicarLance(c, mano)).toBe('no quiero → 1');
    expect(explicarLance(p, mano)).toBe('solo Nosotros · pareja de reyes 1 + pareja de sietes 1');
    expect(explicarLance(j, mano)).toBe('31 gana a 32 · envite querido 2 · 31 vale 3');
  });
  it('con los no queridos cobrados, el no quiero se explica como ya cobrado', () => {
    const cobrada = contarMano(mano, { noQueridosCobrados: true }).lances[1] as typeof g;
    expect(explicarLance(cobrada, mano)).toBe('no quiero 1 · ya cobrado');
  });
  it('la chica se compara de menor a mayor', () => {
    const m: ManoJugada = { ...mano, lances: [pasan('grande'), pasan('chica'), l('pares'), l('juego', env(0, 2), quiero(3))] };
    expect(explicarLance(contarMano(m).lances[1] as typeof g, m)).toBe('1 4 10 11 gana a 4 7 7 10 · en paso 1');
  });
  it('los pares usan nombres de rango: medias, duples mixtos y cuatro iguales', () => {
    const pares = (cartas: string[], cuarto: LanceJugado['lance'], todos: boolean): string => {
      const jugadas: Jugadas = [jugada(cartas[0] as string), jugada(cartas[1] as string), jugada('6 5 2 1'), jugada('6 4 3 1')];
      const m: ManoJugada = {
        jugadas,
        mano: 0,
        lances: [
          pasan('grande'),
          pasan('chica'),
          l('pares', env(0, 2), quiero(1)),
          cuarto === 'punto' ? pasan(cuarto) : todos ? l(cuarto, paso(0), paso(1)) : l(cuarto),
        ],
      };
      return explicarLance(contarMano(m).lances[2] as typeof g, m);
    };
    expect(pares(['7 7 7 4', 'R R 5 5'], 'punto', true)).toBe(
      'duples de reyes y cincos gana a medias de sietes · envite querido 2 · duples de reyes y cincos 3',
    );
    expect(pares(['R R 7 7', '4 4 4 1'], 'juego', false)).toBe(
      'duples de reyes y sietes gana a medias de cuatros · envite querido 2 · duples de reyes y sietes 3',
    );
    expect(pares(['S S S S', 'C C 7 7'], 'juego', true)).toBe(
      'duples de caballos y sietes gana a duples de sotas · envite querido 2 · duples de caballos y sietes 3',
    );
  });
  it('los tantos de pareja y medias usan nombres de rango', () => {
    const m: ManoJugada = {
      jugadas: [jugada('7 7 7 4'), jugada('C 4 3 1'), jugada('S S 4 1'), jugada('6 4 3 1')],
      mano: 0,
      lances: [pasan('grande'), pasan('chica'), l('pares'), pasan('punto')],
    };
    expect(explicarLance(contarMano(m).lances[2] as typeof g, m)).toBe(
      'solo Nosotros · medias de sietes 2 + pareja de sotas 1',
    );
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
    expect(simbolo({ rango: 10, palo: 0 })).toBe('10');
    expect(simbolo({ rango: 12, palo: 3 })).toBe('12');
  });
  it('cartasDecisivas une ganador y tantos sin repetir', () => {
    expect(cartasDecisivas(j)).toEqual([3]);
    expect(cartasDecisivas(p)).toEqual([0, 2]);
    expect(cartasDecisivas(g)).toEqual([0]);
  });
  it('dichos: lo que canta cada jugador al preguntar pares y juego', () => {
    expect(dichos(jugada('R R 7 5'))).toBe('pares sí · juego sí');
    expect(dichos(jugada('R C S 1'))).toBe('pares no · juego sí');
    expect(dichos(jugada('7 7 S 4'))).toBe('pares sí · juego no');
    expect(dichos(jugada('6 4 3 1'))).toBe('pares no · juego no');
  });
});
