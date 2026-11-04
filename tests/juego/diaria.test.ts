import { describe, expect, it } from 'vitest';
import { DIA_CERO, diaDe, manosDelDia, numeroDelDia, tandaDelDia } from '../../src/juego/diaria';
import type { Marca, ResultadoMano } from '../../src/juego/tanda';
import { NIVELES_TANDA } from '../../src/juego/tanda';
import { textoCompartir } from '../../src/ui/formato';

const mano = (acierto: boolean, decimas = 100): ResultadoMano => ({ nivel: 1, acierto, decimas });

describe('tanda del día', () => {
  it('el día es la fecha local del móvil, no la UTC', () => {
    // 23:30 del 5 de noviembre en hora local, sea cual sea la zona.
    expect(diaDe(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05');
    expect(diaDe(new Date(2026, 0, 9, 0, 5))).toBe('2026-01-09');
  });

  it('el primer día es el #1 y cuenta un día por fecha', () => {
    expect(numeroDelDia(DIA_CERO)).toBe(1);
    expect(numeroDelDia('2026-11-06')).toBe(2);
    expect(numeroDelDia('2026-12-05')).toBe(31);
    expect(numeroDelDia('2027-11-05')).toBe(366);
  });

  it('el mismo día da las mismas manos y otro día, otras', () => {
    const a = manosDelDia('2026-11-07');
    expect(a).toHaveLength(NIVELES_TANDA.length);
    expect(manosDelDia('2026-11-07')).toEqual(a);
    expect(manosDelDia('2026-11-08')).not.toEqual(a);
  });

  it('encuentra la tanda del día en el historial', () => {
    const libre: Marca = { fecha: '2026-11-07T09:00:00.000Z', fallos: 0, decimas: 50, manos: [] };
    const hoy: Marca = { ...libre, fallos: 2, dia: '2026-11-07' };
    const ayer: Marca = { ...libre, dia: '2026-11-06' };
    expect(tandaDelDia([ayer, libre, hoy], '2026-11-07')).toBe(hoy);
    expect(tandaDelDia([ayer, libre], '2026-11-07')).toBeNull();
  });

  it('el texto para compartir lleva número, fallos, tiempo, un cuadrado por mano y el enlace', () => {
    const marca: Marca = {
      fecha: '',
      fallos: 1,
      decimas: 1343,
      manos: [mano(true), mano(true), mano(false), ...Array.from({ length: 7 }, () => mano(true))],
      dia: '2026-11-16',
    };
    expect(textoCompartir(marca, 'https://mikelraz.github.io/tantos/')).toBe(
      'Tantos #12 · 1 fallo · 2:14,3\n🟩🟩🟥🟩🟩🟩🟩🟩🟩🟩\nhttps://mikelraz.github.io/tantos/',
    );
  });

  it('con los no queridos cobrados el número lleva asterisco', () => {
    const marca: Marca = {
      fecha: '',
      fallos: 0,
      decimas: 600,
      manos: [mano(true)],
      dia: DIA_CERO,
      noQueridosCobrados: true,
    };
    expect(textoCompartir(marca, 'u').split('\n')[0]).toBe('Tantos #1* · 0 fallos · 1:00,0');
  });
});
