import { describe, expect, it } from 'vitest';
import type { Desglose } from '../../src/reglas/contar';
import {
  NIVELES_TANDA,
  compararMarcas,
  crearMarca,
  esCorrecta,
  parejasFalladas,
  type Marca,
  type ResultadoMano,
} from '../../src/juego/tanda';

const desglose = (total: [number, number]): Desglose => ({ lances: [], total });
const marca = (fallos: number, decimas: number): Marca => ({
  fecha: '2026-11-03T10:00:00.000Z',
  fallos,
  decimas,
  manos: [],
});

describe('tanda', () => {
  it('son 10 manos con la progresión de niveles fijada', () => {
    expect(NIVELES_TANDA).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 3]);
  });

  it('esCorrecta exige ambas parejas', () => {
    expect(esCorrecta([4, 6], desglose([4, 6]))).toBe(true);
    expect(esCorrecta([6, 6], desglose([4, 6]))).toBe(false);
  });

  it('parejasFalladas señala las parejas erróneas', () => {
    expect(parejasFalladas([6, 6], desglose([4, 6]))).toEqual([0]);
    expect(parejasFalladas([4, 6], desglose([4, 6]))).toEqual([]);
    expect(parejasFalladas([0, 0], desglose([4, 6]))).toEqual([0, 1]);
  });

  it('compararMarcas: primero fallos, luego décimas', () => {
    expect(compararMarcas(marca(0, 900), marca(1, 400))).toBeLessThan(0);
    expect(compararMarcas(marca(1, 400), marca(0, 900))).toBeGreaterThan(0);
    expect(compararMarcas(marca(2, 300), marca(2, 500))).toBeLessThan(0);
    expect(compararMarcas(marca(2, 300), marca(2, 300))).toBe(0);
  });

  it('crearMarca suma fallos y décimas y guarda la fecha ISO', () => {
    const manos: ResultadoMano[] = [
      { nivel: 1, acierto: true, decimas: 120 },
      { nivel: 2, acierto: false, decimas: 200 },
      { nivel: 3, acierto: false, decimas: 80 },
    ];
    const m = crearMarca(manos, new Date('2026-11-03T10:00:00.000Z'), false);
    expect(m).toEqual({
      fecha: '2026-11-03T10:00:00.000Z',
      fallos: 2,
      decimas: 400,
      manos,
      noQueridosCobrados: false,
    });
  });
});
