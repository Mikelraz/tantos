import { describe, expect, it } from 'vitest';
import { jugada } from '../../src/reglas/cartas';
import type { Intervencion } from '../../src/reglas/apuestas';
import { contarMano, type LanceJugado } from '../../src/reglas/contar';
import type { Jugadas } from '../../src/reglas/cotejo';

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
const todosPasan = (lance: LanceJugado['lance']): LanceJugado =>
  l(lance, paso(0), paso(1), paso(2), paso(3));

describe('contarMano', () => {
  it('cuenta el ejemplo de los bocetos', () => {
    const jugadas: Jugadas = [
      jugada('R R 7 5'),
      jugada('C S 4 1'),
      jugada('7 7 S 4'),
      jugada('R C S 1'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [
        l('grande', env(0, 2), quiero(1)),
        l('chica', paso(0), env(1, 2), noQuiero(2)),
        l('pares'),
        l('juego', env(0, 2), quiero(3)),
      ],
    });
    expect(d.total).toEqual([4, 6]);
    const [g, c, p, j] = d.lances;
    expect(g?.apuesta).toEqual([2, 0]);
    expect(c?.apuesta).toEqual([0, 1]);
    expect(p?.tantos).toEqual([2, 0]);
    expect(p?.puestosTantos).toEqual([0, 2]);
    expect(j?.apuesta).toEqual([0, 2]);
    expect(j?.tantos).toEqual([0, 3]);
    expect(j?.puestosTantos).toEqual([3]);
    expect(j?.puestoGanador).toBe(3);
  });

  it('paga 1 al ganador de grande y chica en paso', () => {
    const jugadas: Jugadas = [
      jugada('R 7 5 1'),
      jugada('C 4 3 1'),
      jugada('6 5 2 1'),
      jugada('6 4 3 1'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [todosPasan('grande'), todosPasan('chica'), l('pares'), todosPasan('punto')],
    });
    expect(d.lances[0]?.apuesta).toEqual([1, 0]);
    expect(d.lances[0]?.puestoGanador).toBe(0);
    expect(d.lances[1]?.apuesta).toEqual([1, 0]);
  });

  it('punto en paso: apuesta 0 y 1 de tantos al ganador', () => {
    const jugadas: Jugadas = [
      jugada('R 7 5 1'),
      jugada('C 4 3 1'),
      jugada('6 5 2 1'),
      jugada('6 4 3 1'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [todosPasan('grande'), todosPasan('chica'), l('pares'), todosPasan('punto')],
    });
    // Suman 23, 18, 14, 14: gana la pareja 0.
    expect(d.lances[3]?.lance).toBe('punto');
    expect(d.lances[3]?.apuesta).toEqual([0, 0]);
    expect(d.lances[3]?.tantos).toEqual([1, 0]);
  });

  it('punto querido de 2 paga 2 más 1', () => {
    const jugadas: Jugadas = [
      jugada('R 7 5 1'),
      jugada('C 4 3 1'),
      jugada('6 5 2 1'),
      jugada('6 4 3 1'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [
        todosPasan('grande'),
        todosPasan('chica'),
        l('pares'),
        l('punto', env(0, 2), quiero(1)),
      ],
    });
    expect(d.lances[3]?.apuesta).toEqual([2, 0]);
    expect(d.lances[3]?.tantos).toEqual([1, 0]);
  });

  it('pares de una sola pareja: sin_rival y solo sus tantos', () => {
    const jugadas: Jugadas = [
      jugada('R 7 5 1'),
      jugada('C C 4 1'),
      jugada('6 4 2 1'),
      jugada('5 5 5 1'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [todosPasan('grande'), todosPasan('chica'), l('pares'), todosPasan('punto')],
    });
    const p = d.lances[2];
    expect(p?.resultado.resolucion).toBe('sin_rival');
    expect(p?.ganador).toBe(1);
    expect(p?.puestoGanador).toBeNull();
    expect(p?.puestosTantos).toEqual([1, 3]);
    // C C: pareja (1); S S S: medias (2).
    expect(p?.tantos).toEqual([0, 3]);
  });

  it('nadie con pares: cobro cero y sin ganador', () => {
    const jugadas: Jugadas = [
      jugada('R 7 5 1'),
      jugada('C 6 4 1'),
      jugada('6 4 2 1'),
      jugada('S 5 3 2'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [todosPasan('grande'), todosPasan('chica'), l('pares'), todosPasan('punto')],
    });
    const p = d.lances[2];
    expect(p?.ganador).toBeNull();
    expect(p?.apuesta).toEqual([0, 0]);
    expect(p?.tantos).toEqual([0, 0]);
    expect(p?.puestosTantos).toEqual([]);
  });

  it('pares no queridos: cobra la piedra y sus tantos aunque el rival tenga mejores pares', () => {
    // Pareja 0: pareja de 4 (1) y medias de 5 (2). Pareja 1: duples de reyes (le gana al cotejo).
    const jugadas: Jugadas = [
      jugada('4 4 7 1'),
      jugada('R R 5 5'),
      jugada('5 5 5 1'),
      jugada('3 2 1 7'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [
        todosPasan('grande'),
        todosPasan('chica'),
        l('pares', env(0, 2), noQuiero(1)),
        todosPasan('punto'),
      ],
    });
    const p = d.lances[2];
    expect(p?.resultado.resolucion).toBe('no_querido');
    expect(p?.ganador).toBe(0);
    expect(p?.puestoGanador).toBeNull();
    expect(p?.apuesta).toEqual([1, 0]);
    expect(p?.tantos).toEqual([3, 0]);
    expect(p?.puestosTantos).toEqual([0, 2]);
  });

  it('juego querido: suman los tantos de los dos compañeros con juego', () => {
    // 0 tiene 31 (3 tantos), 2 tiene 40 (2 tantos). Gana el 31 de 0.
    const jugadas: Jugadas = [
      jugada('R R S 1'),
      jugada('C C 7 6'),
      jugada('R R C S'),
      jugada('5 3 2 1'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [
        todosPasan('grande'),
        todosPasan('chica'),
        l('pares', paso(0), paso(1), paso(2)),
        l('juego', env(0, 2), quiero(1)),
      ],
    });
    const j = d.lances[3];
    expect(j?.lance).toBe('juego');
    expect(j?.ganador).toBe(0);
    expect(j?.apuesta).toEqual([2, 0]);
    expect(j?.tantos).toEqual([5, 0]);
    expect(j?.puestosTantos).toEqual([0, 2]);
  });

  it('pares en paso con las dos parejas: sin piedras, solo los tantos del ganador', () => {
    const jugadas: Jugadas = [
      jugada('4 4 7 1'),
      jugada('R R 5 5'),
      jugada('5 5 5 1'),
      jugada('3 2 1 7'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [
        todosPasan('grande'),
        todosPasan('chica'),
        l('pares', paso(0), paso(1), paso(2)),
        todosPasan('punto'),
      ],
    });
    const p = d.lances[2];
    expect(p?.resultado.resolucion).toBe('en_paso');
    expect(p?.ganador).toBe(1);
    expect(p?.puestoGanador).toBe(1);
    expect(p?.apuesta).toEqual([0, 0]);
    expect(p?.tantos).toEqual([0, 3]);
    expect(p?.puestosTantos).toEqual([1]);
  });

  it('juego en paso con las dos parejas: sin piedras, solo los tantos del ganador', () => {
    const jugadas: Jugadas = [
      jugada('R R S 1'),
      jugada('C C 7 6'),
      jugada('R R C S'),
      jugada('5 3 2 1'),
    ];
    const d = contarMano({
      jugadas,
      mano: 0,
      lances: [
        todosPasan('grande'),
        todosPasan('chica'),
        l('pares', paso(0), paso(1), paso(2)),
        l('juego', paso(0), paso(1), paso(2)),
      ],
    });
    const j = d.lances[3];
    expect(j?.resultado.resolucion).toBe('en_paso');
    expect(j?.ganador).toBe(0);
    expect(j?.apuesta).toEqual([0, 0]);
    expect(j?.tantos).toEqual([5, 0]);
    expect(j?.puestosTantos).toEqual([0, 2]);
  });
});

describe('contarMano con los no queridos cobrados al momento', () => {
  const jugadas: Jugadas = [
    jugada('4 4 7 1'),
    jugada('R R 5 5'),
    jugada('5 5 5 1'),
    jugada('3 2 1 7'),
  ];
  const mano = {
    jugadas,
    mano: 0,
    lances: [
      l('grande', paso(0), env(1, 2), env(2, 7), noQuiero(3)),
      l('chica', paso(0), paso(1), paso(2), paso(3)),
      l('pares', env(0, 2), noQuiero(1)),
      l('punto', paso(0), paso(1), { puesto: 2, accion: { tipo: 'ordago' } }, noQuiero(3)),
    ],
  };

  it('la piedra del no quiero pasa a cobrada y no entra en el total; los tantos sí', () => {
    const normal = contarMano(mano);
    const d = contarMano(mano, { noQueridosCobrados: true });
    const [g, c, p, pu] = d.lances;
    expect(g?.apuesta).toEqual([0, 0]);
    expect(g?.cobrado).toEqual([2, 0]);
    expect(c?.apuesta).toEqual(normal.lances[1]?.apuesta);
    expect(c?.cobrado).toEqual([0, 0]);
    expect(p?.apuesta).toEqual([0, 0]);
    expect(p?.cobrado).toEqual([1, 0]);
    expect(p?.tantos).toEqual([3, 0]);
    // Órdago no querido de apertura: 1 ya cobrado; el punto se cobra al final.
    expect(pu?.cobrado).toEqual([1, 0]);
    expect(pu?.tantos).toEqual([1, 0]);
    expect(d.total).toEqual([normal.total[0] - 4, normal.total[1]]);
  });

  it('sin la opción no hay nada cobrado', () => {
    for (const c of contarMano(mano).lances) expect(c.cobrado).toEqual([0, 0]);
  });
});
