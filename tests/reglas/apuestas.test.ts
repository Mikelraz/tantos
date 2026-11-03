import { describe, expect, it } from 'vitest';
import { jugarLance, reproducirLance, type Accion, type Intervencion } from '../../src/reglas/apuestas';

const paso: Accion = { tipo: 'paso' };
const env = (cantidad: number): Accion => ({ tipo: 'envido', cantidad });
const ordago: Accion = { tipo: 'ordago' };
const quiero: Accion = { tipo: 'quiero' };
const noQuiero: Accion = { tipo: 'no_quiero' };
const h = (...xs: [number, Accion][]): Intervencion[] => xs.map(([puesto, accion]) => ({ puesto, accion }));
const P = [0, 1, 2, 3];

describe('jugarLance / reproducirLance', () => {
  it('todos pasan', () => {
    const r = reproducirLance(P, h([0, paso], [1, paso], [2, paso], [3, paso]));
    expect(r).toMatchObject({ resolucion: 'en_paso', puesta: 1, parejaAdjudicada: null });
  });
  it('paso, envido 2, no quiero', () => {
    const r = reproducirLance(P, h([0, paso], [1, env(2)], [2, noQuiero]));
    expect(r).toMatchObject({ resolucion: 'no_querido', puesta: 1, parejaAdjudicada: 1 });
  });
  it('subida: valorRechazo = pendiente', () => {
    const r = reproducirLance(P, h([0, env(2)], [1, env(7)], [2, noQuiero]));
    expect(r).toMatchObject({ resolucion: 'no_querido', puesta: 2, parejaAdjudicada: 1 });
  });
  it('órdago como subida y como apertura', () => {
    expect(reproducirLance(P, h([0, env(2)], [1, ordago], [2, noQuiero]))).toMatchObject({
      resolucion: 'no_querido',
      puesta: 2,
      parejaAdjudicada: 1,
    });
    expect(reproducirLance(P, h([0, ordago], [1, noQuiero]))).toMatchObject({
      resolucion: 'no_querido',
      puesta: 1,
      parejaAdjudicada: 0,
    });
    expect(reproducirLance(P, h([0, ordago], [1, quiero]))).toMatchObject({
      resolucion: 'ordago',
      puesta: 40,
    });
  });
  it('querido', () => {
    expect(reproducirLance(P, h([0, env(2)], [1, quiero]))).toMatchObject({
      resolucion: 'querido',
      puesta: 2,
    });
  });
  it('recorta al tope sin promover a órdago', () => {
    expect(reproducirLance(P, h([0, env(99)], [1, quiero]))).toMatchObject({
      resolucion: 'querido',
      puesta: 40,
    });
  });
  it('turnos: contesta el siguiente rival', () => {
    expect(reproducirLance([0, 2, 3], h([0, env(2)], [3, quiero])).resolucion).toBe('querido');
    expect(() => reproducirLance([0, 2, 3], h([0, env(2)], [2, quiero]))).toThrow();
  });
  it('el estado que ve elegir', () => {
    const vistos: number[] = [];
    jugarLance(P, (e) => {
      vistos.push(e.puesto);
      return e.puesto === 0 ? env(2) : quiero;
    });
    expect(vistos).toEqual([0, 1]);
  });
  it('errores', () => {
    expect(() => reproducirLance(P, h([0, env(1)], [1, quiero]))).toThrow();
    expect(() => reproducirLance(P, h([1, paso]))).toThrow();
    expect(() => reproducirLance(P, h([0, env(2)], [1, quiero], [2, paso]))).toThrow();
    expect(() => reproducirLance(P, h([0, paso]))).toThrow();
    expect(() => reproducirLance(P, h([0, quiero]))).toThrow();
    expect(() => reproducirLance(P, h([0, env(2)], [1, paso]))).toThrow();
    expect(() => reproducirLance(P, h([0, ordago], [1, env(5)]))).toThrow();
    expect(() => reproducirLance(P, h([0, ordago], [1, ordago]))).toThrow();
    expect(() => reproducirLance(P, h([0, env(40)], [1, env(42)]))).toThrow();
    expect(() => reproducirLance(P, h([0, env(5)], [1, env(6)]))).toThrow();
  });
  it('sin rival / sin participantes', () => {
    expect(reproducirLance([0, 2], [])).toMatchObject({
      resolucion: 'sin_rival',
      parejaAdjudicada: 0,
      historial: [],
    });
    expect(reproducirLance([], [])).toMatchObject({
      resolucion: 'sin_participantes',
      parejaAdjudicada: null,
    });
  });
});
