import { describe, expect, it } from 'vitest';
import { Cronometro } from '../../src/juego/cronometro';

function relojFalso() {
  let t = 0;
  return { ahora: () => t, poner: (ms: number) => (t = ms) };
}

describe('Cronometro', () => {
  it('descuenta la pausa: 3000 + 2500 ms = 55 décimas', () => {
    const r = relojFalso();
    const c = new Cronometro(r.ahora);
    r.poner(0);
    c.iniciar();
    expect(c.enMarcha).toBe(true);
    r.poner(3000);
    c.pausar();
    expect(c.enMarcha).toBe(false);
    r.poner(10000);
    c.reanudar();
    expect(c.enMarcha).toBe(true);
    r.poner(12500);
    expect(c.detener()).toBe(55);
    expect(c.enMarcha).toBe(false);
  });

  it('pausar dos veces no corrompe el total', () => {
    const r = relojFalso();
    const c = new Cronometro(r.ahora);
    c.iniciar();
    r.poner(1000);
    c.pausar();
    r.poner(5000);
    c.pausar();
    r.poner(6000);
    c.reanudar();
    r.poner(7000);
    expect(c.detener()).toBe(20);
  });

  it('reanudar en marcha no reinicia el tramo', () => {
    const r = relojFalso();
    const c = new Cronometro(r.ahora);
    c.iniciar();
    r.poner(1000);
    c.reanudar();
    r.poner(2000);
    expect(c.detener()).toBe(20);
  });

  it('detener en pausa devuelve lo acumulado y reiniciar empieza de cero', () => {
    const r = relojFalso();
    const c = new Cronometro(r.ahora);
    c.iniciar();
    r.poner(1500);
    c.pausar();
    r.poner(9000);
    expect(c.detener()).toBe(15);
    c.iniciar();
    r.poner(9500);
    expect(c.detener()).toBe(5);
  });

  it('leer da las décimas hasta ahora sin parar ni contar la pausa', () => {
    const r = relojFalso();
    const c = new Cronometro(r.ahora);
    c.iniciar();
    r.poner(1290);
    expect(c.leer()).toBe(12);
    expect(c.enMarcha).toBe(true);
    c.pausar();
    r.poner(5000);
    expect(c.leer()).toBe(12);
    c.reanudar();
    r.poner(5800);
    expect(c.leer()).toBe(20);
    expect(c.detener()).toBe(20);
  });
});
