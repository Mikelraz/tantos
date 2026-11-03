import { describe, expect, it } from 'vitest';
import { generarMano, type Nivel } from '../../src/generar/generar';
import { rngSembrado } from '../../src/generar/rng';
import { contarMano } from '../../src/reglas/contar';

const SEMILLAS = Array.from({ length: 500 }, (_, i) => i + 1);
const mano = (nivel: Nivel, s: number) => generarMano(nivel, rngSembrado(s));
const resoluciones = (nivel: Nivel, s: number) =>
  contarMano(mano(nivel, s)).lances.map((l) => l.resultado.resolucion);

describe('generarMano', () => {
  it('toda mano generada se cuenta sin errores', () => {
    for (const nivel of [1, 2, 3] as const) {
      for (const s of SEMILLAS) expect(() => contarMano(mano(nivel, s))).not.toThrow();
    }
  });

  it('nivel 1: todo paso', () => {
    for (const s of SEMILLAS) {
      for (const r of resoluciones(1, s)) {
        expect(['en_paso', 'sin_rival', 'sin_participantes']).toContain(r);
      }
    }
  });

  it('nivel 2: 1 o 2 lances envidados con un envido y ningún órdago', () => {
    for (const s of SEMILLAS) {
      const d = contarMano(mano(2, s));
      const envidados = d.lances.filter((l) =>
        ['querido', 'no_querido'].includes(l.resultado.resolucion),
      );
      expect(envidados.length).toBeGreaterThanOrEqual(1);
      expect(envidados.length).toBeLessThanOrEqual(2);
      for (const l of envidados) {
        const h = l.resultado.historial;
        expect(h.filter((i) => i.accion.tipo === 'envido')).toHaveLength(1);
        expect(h.some((i) => i.accion.tipo === 'ordago')).toBe(false);
      }
    }
  });

  it('nivel 3: hay subida u órdago no querido y nunca un órdago querido', () => {
    for (const s of SEMILLAS) {
      const d = contarMano(mano(3, s));
      const fuerte = d.lances.some((l) => {
        const h = l.resultado.historial;
        const apuestas = h.filter((i) => ['envido', 'ordago'].includes(i.accion.tipo)).length;
        const ordagoNo =
          h.some((i) => i.accion.tipo === 'ordago') &&
          h[h.length - 1]?.accion.tipo === 'no_quiero';
        return apuestas >= 2 || ordagoNo;
      });
      expect(fuerte).toBe(true);
      for (const l of d.lances) expect(l.resultado.resolucion).not.toBe('ordago');
    }
  });

  it('la mano cae en los cuatro asientos', () => {
    const vistos = new Set<number>();
    for (let s = 1; s <= 200; s++) vistos.add(mano(2, s).mano);
    expect(vistos.size).toBe(4);
  });

  it('la misma semilla da la misma mano', () => {
    for (const nivel of [1, 2, 3] as const) {
      expect(mano(nivel, 42)).toEqual(mano(nivel, 42));
    }
  });
});
