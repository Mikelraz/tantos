import { describe, expect, it } from 'vitest';
import {
  CLAVE_HISTORIAL,
  cargarHistorial,
  esNuevaMejor,
  cargarModo,
  guardarMarca,
  guardarModo,
  marcasDelModo,
  mejorMarca,
} from '../../src/juego/historial';
import { crearMarca, type Marca } from '../../src/juego/tanda';

const marca = (fallos: number, decimas: number, fecha = '2026-11-03T10:00:00.000Z'): Marca => ({
  fecha,
  fallos,
  decimas,
  manos: [],
});

function almacenFalso(inicial: Record<string, string> = {}): Storage {
  const d = { ...inicial };
  return {
    getItem: (k: string) => d[k] ?? null,
    setItem: (k: string, v: string) => void (d[k] = v),
  } as unknown as Storage;
}

const almacenRoto = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('cuota');
  },
} as unknown as Storage;

describe('historial', () => {
  it('sin almacén o con almacén roto no falla', () => {
    expect(cargarHistorial(null)).toEqual([]);
    expect(() => guardarMarca(marca(0, 1), null)).not.toThrow();
    expect(cargarHistorial(almacenRoto)).toEqual([]);
    expect(() => guardarMarca(marca(0, 1), almacenRoto)).not.toThrow();
  });

  it('JSON corrupto o que no es una lista de marcas da []', () => {
    expect(cargarHistorial(almacenFalso({ [CLAVE_HISTORIAL]: '{no json' }))).toEqual([]);
    expect(cargarHistorial(almacenFalso({ [CLAVE_HISTORIAL]: '{"a":1}' }))).toEqual([]);
    expect(cargarHistorial(almacenFalso({ [CLAVE_HISTORIAL]: '"hola"' }))).toEqual([]);
    expect(cargarHistorial(almacenFalso({ [CLAVE_HISTORIAL]: 'null' }))).toEqual([]);
    expect(cargarHistorial(almacenFalso({ [CLAVE_HISTORIAL]: '[1,2]' }))).toEqual([]);
    expect(cargarHistorial(almacenFalso({ [CLAVE_HISTORIAL]: '[{"fallos":"x"}]' }))).toEqual([]);
  });

  it('una entrada mal formada no borra las marcas válidas al guardar otra', () => {
    const m1 = marca(1, 500, '2026-11-01T10:00:00.000Z');
    const a = almacenFalso({ [CLAVE_HISTORIAL]: JSON.stringify([m1, { fallos: 'x' }, 7]) });
    expect(cargarHistorial(a)).toEqual([m1]);
    const m2 = marca(0, 700, '2026-11-02T10:00:00.000Z');
    guardarMarca(m2, a);
    expect(cargarHistorial(a)).toEqual([m1, m2]);
  });

  it('guardar dos marcas y cargarlas las devuelve en orden', () => {
    const a = almacenFalso();
    const m1 = marca(1, 500, '2026-11-01T10:00:00.000Z');
    const m2 = marca(0, 700, '2026-11-02T10:00:00.000Z');
    guardarMarca(m1, a);
    guardarMarca(m2, a);
    expect(cargarHistorial(a)).toEqual([m1, m2]);
  });

  it('mejorMarca elige la mejor o null', () => {
    expect(mejorMarca([])).toBeNull();
    const h = [marca(1, 100), marca(0, 900), marca(0, 800)];
    expect(mejorMarca(h)).toEqual(marca(0, 800));
  });

  it('esNuevaMejor: primera marca es récord; empate no lo es', () => {
    expect(esNuevaMejor(marca(3, 999), [])).toBe(true);
    const h = [marca(0, 800)];
    expect(esNuevaMejor(marca(0, 700), h)).toBe(true);
    expect(esNuevaMejor(marca(0, 800), h)).toBe(false);
    expect(esNuevaMejor(marca(1, 100), h)).toBe(false);
  });

  it('cada marca guarda su modo; las de antes del modo cuentan como no cobrados', () => {
    const fecha = new Date('2026-11-04T10:00:00.000Z');
    const cobrados = crearMarca([], fecha, true);
    const normal = crearMarca([], fecha, false);
    expect(cobrados.noQueridosCobrados).toBe(true);
    const antigua = marca(0, 100);
    const h = [antigua, cobrados, normal];
    expect(marcasDelModo(h, true)).toEqual([cobrados]);
    expect(marcasDelModo(h, false)).toEqual([antigua, normal]);
  });

  it('el modo se recuerda; por defecto y sin almacén está desactivado', () => {
    const a = almacenFalso();
    expect(cargarModo(a)).toBe(false);
    guardarModo(true, a);
    expect(cargarModo(a)).toBe(true);
    guardarModo(false, a);
    expect(cargarModo(a)).toBe(false);
    expect(cargarModo(null)).toBe(false);
    expect(cargarModo(almacenRoto)).toBe(false);
    expect(() => guardarModo(true, null)).not.toThrow();
    expect(() => guardarModo(true, almacenRoto)).not.toThrow();
  });
});
