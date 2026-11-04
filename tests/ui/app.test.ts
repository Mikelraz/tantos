// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { rngSembrado } from '../../src/generar/rng';
import { CLAVE_HISTORIAL } from '../../src/juego/historial';
import type { Marca } from '../../src/juego/tanda';
import { cartasDecisivas } from '../../src/juego/textos';
import { contarMano } from '../../src/reglas/contar';
import { montarApp } from '../../src/ui/app';
import { graficaMarcas, MARCAS_EN_GRAFICA } from '../../src/ui/grafica';

function almacenFalso(): Storage & { datos: Record<string, string> } {
  const datos: Record<string, string> = {};
  return {
    datos,
    getItem: (k: string) => datos[k] ?? null,
    setItem: (k: string, v: string) => void (datos[k] = v),
  } as unknown as Storage & { datos: Record<string, string> };
}

function preparar(almacen: Storage | null = almacenFalso()) {
  let t = 0;
  const raiz = document.createElement('div');
  document.body.replaceChildren(raiz);
  const app = montarApp(raiz, { rng: rngSembrado(7), ahora: () => t, almacen, documento: document });
  return { raiz, app, avanzar: (ms: number) => void (t += ms) };
}

type Preparado = ReturnType<typeof preparar>;

function boton(raiz: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...raiz.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  if (!b) throw new Error(`no hay botón "${texto}"`);
  return b;
}

function pulsar(raiz: HTMLElement, selector: string): void {
  const e = raiz.querySelector<HTMLElement>(selector);
  if (!e) throw new Error(`no hay ${selector}`);
  e.click();
}

const tecla = (raiz: HTMLElement, t: string) => pulsar(raiz, `[data-tecla="${t}"]`);
const casilla = (raiz: HTMLElement, p: 0 | 1) => pulsar(raiz, `[data-casilla="${p}"]`);
const valorCasilla = (raiz: HTMLElement, p: 0 | 1) =>
  raiz.querySelector(`[data-casilla="${p}"] .valor`)?.textContent ?? '';

function teclear(raiz: HTMLElement, resp: [number, number]): void {
  for (const p of [0, 1] as const) {
    casilla(raiz, p);
    for (const d of String(resp[p])) tecla(raiz, d);
  }
}

function solucionActual({ app }: Preparado): [number, number] {
  const m = app.manoActual();
  if (!m) throw new Error('no hay mano en pantalla');
  return contarMano(m).total;
}

function responder(p: Preparado, acertar: boolean): [number, number] {
  const [x, y] = solucionActual(p);
  const resp: [number, number] = acertar ? [x, y] : [x + 1, y];
  teclear(p.raiz, resp);
  boton(p.raiz, 'Comprobar').click();
  return resp;
}

function ponerVisibilidad(estado: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
  document.dispatchEvent(new Event('visibilitychange'));
}

function marcasGuardadas(almacen: Storage): Marca[] {
  return JSON.parse(almacen.getItem(CLAVE_HISTORIAL) ?? '[]') as Marca[];
}

const dato = (raiz: HTMLElement, nombre: string) =>
  raiz.querySelector(`[data-dato="${nombre}"]`)?.textContent ?? null;

afterEach(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
});

describe('interfaz', () => {
  it('inicio: "Empezar tanda" lleva a la mano 1', () => {
    const p = preparar();
    expect(p.app.manoActual()).toBeNull();
    boton(p.raiz, 'Empezar tanda').click();
    expect(p.raiz.textContent).toContain('Mano 1 / 10');
    expect(p.app.manoActual()).not.toBeNull();
    expect(p.raiz.querySelectorAll('.carta')).toHaveLength(16);
  });

  it('Comprobar se activa con las dos casillas; un tercer dígito se ignora', () => {
    const p = preparar();
    boton(p.raiz, 'Empezar tanda').click();
    const comprobar = boton(p.raiz, 'Comprobar');
    expect(comprobar.disabled).toBe(true);

    tecla(p.raiz, '4'); // Nosotros está seleccionada al empezar.
    expect(valorCasilla(p.raiz, 0)).toBe('4');
    expect(comprobar.disabled).toBe(true);

    casilla(p.raiz, 1);
    tecla(p.raiz, '1');
    tecla(p.raiz, '2');
    tecla(p.raiz, '3');
    expect(valorCasilla(p.raiz, 1)).toBe('12');
    expect(comprobar.disabled).toBe(false);

    tecla(p.raiz, 'borrar');
    tecla(p.raiz, 'borrar');
    expect(valorCasilla(p.raiz, 1)).toBe('');
    expect(comprobar.disabled).toBe(true);
    expect(valorCasilla(p.raiz, 0)).toBe('4');
  });

  it('con la respuesta correcta pasa a la mano 2 sin solución', () => {
    const p = preparar();
    boton(p.raiz, 'Empezar tanda').click();
    responder(p, true);
    expect(p.raiz.textContent).toContain('Mano 2 / 10');
    expect(p.raiz.textContent).not.toContain('Fallo');
    expect(p.raiz.querySelector('[data-casilla="0"]')).not.toBeNull();
  });

  it('con una respuesta incorrecta muestra el veredicto y la solución explicada', () => {
    const p = preparar();
    boton(p.raiz, 'Empezar tanda').click();
    const mano = p.app.manoActual();
    const [x, y] = solucionActual(p);
    const [a, b] = responder(p, false);

    expect(p.raiz.querySelector('.veredicto')?.textContent).toBe(
      `Fallo · tú: ${a} – ${b} · era: ${x} – ${y}`,
    );
    expect(boton(p.raiz, 'Siguiente')).toBeTruthy();
    expect(p.raiz.querySelectorAll('.carta')).toHaveLength(16);

    // Solo ha fallado Nosotros: su columna va en rojo y la de Ellos no.
    expect(p.raiz.querySelectorAll('.col-0.fallo').length).toBeGreaterThan(0);
    expect(p.raiz.querySelectorAll('.col-1.fallo')).toHaveLength(0);
    expect(p.raiz.querySelector('.total .col-0')?.textContent).toBe(String(x));
    expect(p.raiz.querySelector('.total .col-1')?.textContent).toBe(String(y));

    // Tocar un lance resalta las cartas que lo deciden.
    const cobros = contarMano(mano!).lances;
    const i = cobros.findIndex((c) => cartasDecisivas(c).length > 0);
    pulsar(p.raiz, `tr[data-lance="${i}"]`);
    const resaltadas = [...p.raiz.querySelectorAll('.jugada.resaltada')].map((e) =>
      Number(e.getAttribute('data-puesto')),
    );
    expect(resaltadas.sort()).toEqual([...cartasDecisivas(cobros[i]!)].sort());

    boton(p.raiz, 'Siguiente').click();
    expect(p.raiz.textContent).toContain('Mano 2 / 10');
  });

  it('el tiempo en la pantalla de solución no cuenta', () => {
    const almacen = almacenFalso();
    const p = preparar(almacen);
    boton(p.raiz, 'Empezar tanda').click();
    p.avanzar(4000);
    responder(p, false);
    p.avanzar(100_000);
    boton(p.raiz, 'Siguiente').click();
    for (let n = 2; n <= 10; n++) {
      p.avanzar(1000);
      responder(p, true);
    }
    const [marca] = marcasGuardadas(almacen);
    expect(marca?.fallos).toBe(1);
    expect(marca?.decimas).toBe(40 + 9 * 10);
    expect(marca?.manos[0]).toEqual({ nivel: 1, acierto: false, decimas: 40 });
  });

  it('con el documento oculto 60 s el tiempo no cuenta y las cartas se tapan', () => {
    const almacen = almacenFalso();
    const p = preparar(almacen);
    boton(p.raiz, 'Empezar tanda').click();
    p.avanzar(2000);

    ponerVisibilidad('hidden');
    expect(p.raiz.querySelector('.mesa')?.classList.contains('tapada')).toBe(true);
    p.avanzar(60_000);
    ponerVisibilidad('visible');
    p.avanzar(5000);

    // Las cartas siguen tapadas hasta tocar la capa.
    expect(p.raiz.querySelector('.mesa')?.classList.contains('tapada')).toBe(true);
    const capa = p.raiz.querySelector<HTMLElement>('.capa-pausa');
    expect(capa?.textContent).toContain('Toca para seguir');
    capa!.click();
    expect(p.raiz.querySelector('.capa-pausa')).toBeNull();
    expect(p.raiz.querySelector('.mesa')?.classList.contains('tapada')).toBe(false);

    p.avanzar(3000);
    responder(p, true);
    for (let n = 2; n <= 10; n++) responder(p, true);
    expect(marcasGuardadas(almacen)[0]?.manos[0]?.decimas).toBe(50);
  });

  it('diez manos completan la tanda y la marca queda guardada', () => {
    const almacen = almacenFalso();
    const p = preparar(almacen);
    boton(p.raiz, 'Empezar tanda').click();
    for (let n = 1; n <= 10; n++) {
      expect(p.raiz.textContent).toContain(`Mano ${n} / 10`);
      p.avanzar(1234);
      responder(p, n !== 5);
      if (n === 5) boton(p.raiz, 'Siguiente').click();
    }
    expect(dato(p.raiz, 'fallos')).toBe('1');
    expect(dato(p.raiz, 'tiempo')).toBe('0:12,0');
    expect(p.raiz.textContent).toContain('Nueva mejor marca');
    expect(p.raiz.querySelectorAll('svg .punto')).toHaveLength(1);
    const marcas = marcasGuardadas(almacen);
    expect(marcas).toHaveLength(1);
    expect(marcas[0]).toMatchObject({ fallos: 1, decimas: 120 });
    expect(marcas[0]?.manos).toHaveLength(10);

    // Otra tanda peor: no es mejor marca y la gráfica tiene dos puntos.
    boton(p.raiz, 'Otra tanda').click();
    expect(p.raiz.textContent).toContain('Mano 1 / 10');
    for (let n = 1; n <= 10; n++) {
      p.avanzar(2000);
      responder(p, false);
      boton(p.raiz, 'Siguiente').click();
    }
    expect(dato(p.raiz, 'fallos')).toBe('10');
    expect(p.raiz.textContent).not.toContain('Nueva mejor marca');
    expect(p.raiz.querySelectorAll('svg .punto')).toHaveLength(2);
    expect(p.raiz.querySelectorAll('svg .punto.limpia')).toHaveLength(0);
    expect(marcasGuardadas(almacen)).toHaveLength(2);
  });

  it('la mejor marca aparece en el inicio', () => {
    const almacen = almacenFalso();
    almacen.setItem(
      CLAVE_HISTORIAL,
      JSON.stringify([{ fecha: '2026-11-01T10:00:00.000Z', fallos: 0, decimas: 754, manos: [] }]),
    );
    const p = preparar(almacen);
    expect(p.raiz.textContent).toContain('Mejor marca');
    expect(dato(p.raiz, 'mejor')).toBe('0 fallos · 1:15,4');
  });

  it('sin almacén la tanda se completa igual', () => {
    const p = preparar(null);
    boton(p.raiz, 'Empezar tanda').click();
    for (let n = 1; n <= 10; n++) {
      p.avanzar(500);
      responder(p, true);
    }
    expect(dato(p.raiz, 'fallos')).toBe('0');
    expect(dato(p.raiz, 'tiempo')).toBe('0:05,0');
    expect(p.raiz.querySelectorAll('svg .punto.limpia')).toHaveLength(1);
    expect(boton(p.raiz, 'Otra tanda')).toBeTruthy();
  });
});

describe('gráfica', () => {
  it('la tanda más lenta va más arriba y solo se dibujan las últimas 20', () => {
    const marca = (decimas: number, fallos = 0): Marca => ({ fecha: '', fallos, decimas, manos: [] });
    const marcas = [...Array.from({ length: 21 }, (_, i) => marca(9000 + i)), marca(100, 1), marca(500)];
    const g = graficaMarcas(document, marcas);
    const puntos = [...g.querySelectorAll('.punto')];
    expect(puntos).toHaveLength(MARCAS_EN_GRAFICA);
    const cy = (i: number) => Number(puntos.at(i)?.getAttribute('cy'));
    expect(cy(-2)).toBeGreaterThan(cy(-1)); // 100 décimas, más rápida: más abajo que 500.
    expect(cy(0)).toBeLessThan(cy(-1));
    expect(puntos.at(-2)?.classList.contains('limpia')).toBe(false);
  });
});
