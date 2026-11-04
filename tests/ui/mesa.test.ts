// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { Carta, Jugada } from '../../src/reglas/cartas';
import type { ManoJugada } from '../../src/reglas/contar';
import { dibujarMesa } from '../../src/ui/mesa';

const c = (rango: Carta['rango'], palo: Carta['palo']): Carta => ({ rango, palo });

describe('cartas de la mesa', () => {
  it('sota, caballo y rey se dibujan como figuras con el palo en la mano', () => {
    const jugada = [c(12, 0), c(11, 1), c(10, 2), c(7, 3)] as unknown as Jugada;
    const mano = { jugadas: [jugada, jugada, jugada, jugada], mano: 0, lances: [] } as unknown as ManoJugada;
    const cartas = [...dibujarMesa(document, mano).elemento.querySelectorAll('.jugada')[0]!.querySelectorAll('.carta')];

    expect(cartas.map((e) => e.getAttribute('aria-label'))).toEqual([
      'Rey de oros', 'Caballo de copas', 'Sota de espadas', 'Siete de bastos',
    ]);
    expect(cartas.map((e) => e.querySelector('.figura')?.classList[1] ?? null)).toEqual([
      'figura-12', 'figura-11', 'figura-10', null,
    ]);
    // La figura lleva el palo en la mano; las demás cartas lo llevan en la esquina.
    expect(cartas.slice(0, 3).every((e) => e.querySelector('.figura .palo-en-mano') && !e.querySelector(':scope > .palo'))).toBe(true);
    expect(cartas[3]!.querySelector(':scope > .palo')).not.toBeNull();
    // El número sigue en la esquina.
    expect(cartas.map((e) => e.querySelector('.indice')?.textContent)).toEqual(['12', '11', '10', '7']);
  });
});
