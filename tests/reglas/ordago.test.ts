import { describe, expect, it } from 'vitest';
import type { Accion, Intervencion } from '../../src/reglas/apuestas';
import type { Carta } from '../../src/reglas/cartas';
import { contarMano, type ManoJugada } from '../../src/reglas/contar';
import { lancesDeLaMano, participantes, type Jugadas } from '../../src/reglas/cotejo';
import type { Lance } from '../../src/reglas/evaluar';
import datos from '../casos/ordago.json';

interface CasoLance {
  lance: Lance;
  resolucion: string;
  participantes: number[];
  historial: [number, Accion['tipo'], number][];
}
interface Cobro {
  lance: Lance;
  pareja: 0 | 1;
  piedras: number;
  motivo: string;
}
interface Caso {
  mano: number;
  jugadas: [number, number][][];
  lances: CasoLance[];
  cobros: Cobro[];
}
const casos = datos.casos as unknown as Caso[];

function accion(tipo: Accion['tipo'], cantidad: number): Accion {
  return tipo === 'envido' ? { tipo, cantidad } : ({ tipo } as Accion);
}

function aManoJugada(c: Caso): ManoJugada {
  return {
    jugadas: c.jugadas.map((j) => j.map(([rango, palo]) => ({ rango, palo }) as Carta)) as unknown as Jugadas,
    mano: c.mano,
    lances: c.lances.map((l) => ({
      lance: l.lance,
      historial: l.historial.map(
        ([puesto, tipo, cantidad]): Intervencion => ({ puesto, accion: accion(tipo, cantidad) }),
      ),
    })),
  };
}

function sumar(c: Caso, lance: Lance, motivos: string[]): [number, number] {
  const s: [number, number] = [0, 0];
  for (const x of c.cobros) {
    if (x.lance === lance && motivos.includes(x.motivo)) s[x.pareja] += x.piedras;
  }
  return s;
}

describe('equivalencia con el motor de ordago', () => {
  it('cuenta cada mano exactamente como ordago', () => {
    const fallos: string[] = [];
    casos.forEach((c, i) => {
      const m = aManoJugada(c);
      let d;
      try {
        d = contarMano(m);
      } catch (e) {
        fallos.push(`caso ${i}: contarMano lanzó ${(e as Error).message}`);
        return;
      }
      const esperados = lancesDeLaMano(m.jugadas);
      if (JSON.stringify(esperados) !== JSON.stringify(c.lances.map((l) => l.lance))) {
        fallos.push(`caso ${i}: lances ${esperados} != ${c.lances.map((l) => l.lance)}`);
      }
      if (d.lances.length !== c.lances.length) {
        fallos.push(`caso ${i}: ${d.lances.length} lances contados, esperados ${c.lances.length}`);
      }
      c.lances.forEach((l, k) => {
        const got = d.lances[k];
        if (got === undefined) {
          fallos.push(`caso ${i} ${l.lance}: contarMano no devolvió el lance ${k}`);
          return;
        }
        if (got.lance !== l.lance) {
          fallos.push(`caso ${i}: lance ${k} es ${got.lance}, esperado ${l.lance}`);
        }
        const quienes = participantes(l.lance, m.jugadas, m.mano);
        if (JSON.stringify(quienes) !== JSON.stringify(l.participantes)) {
          fallos.push(`caso ${i} ${l.lance}: participantes ${quienes} != ${l.participantes}`);
        }
        if (got.resultado.resolucion !== l.resolucion) {
          fallos.push(`caso ${i} ${l.lance}: resolución ${got.resultado.resolucion} != ${l.resolucion}`);
        }
        const ap = sumar(c, l.lance, ['envite', 'paso']);
        const ta = sumar(c, l.lance, ['tantos']);
        if (got.apuesta.join() !== ap.join()) {
          fallos.push(`caso ${i} ${l.lance}: apuesta esperada ${ap} obtenida ${got.apuesta}`);
        }
        if (got.tantos.join() !== ta.join()) {
          fallos.push(`caso ${i} ${l.lance}: tantos esperados ${ta} obtenidos ${got.tantos}`);
        }
      });
    });
    expect(fallos.slice(0, 40), `${fallos.length} discrepancias`).toEqual([]);
  });

  it('cubre todas las resoluciones posibles con al menos 30 casos', () => {
    const cuenta = new Map<string, number>();
    let subidasNoQueridas = 0;
    let ordagosNoQueridos = 0;
    for (const c of casos) {
      for (const l of c.lances) {
        const k = `${l.lance}/${l.resolucion}`;
        cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
        if (l.resolucion !== 'no_querido') continue;
        const tipos = l.historial.map((h) => h[1]);
        if (tipos.filter((t) => t === 'envido').length >= 2) subidasNoQueridas++;
        if (tipos.includes('ordago')) ordagosNoQueridos++;
      }
    }
    const posibles: [Lance, string][] = [];
    for (const l of ['grande', 'chica', 'pares', 'juego', 'punto'] as Lance[]) {
      for (const r of ['en_paso', 'querido', 'no_querido']) posibles.push([l, r]);
    }
    posibles.push(['pares', 'sin_rival'], ['juego', 'sin_rival'], ['pares', 'sin_participantes']);
    const faltan = posibles
      .map(([l, r]) => `${l}/${r}`)
      .filter((k) => (cuenta.get(k) ?? 0) < 30)
      .map((k) => `${k}=${cuenta.get(k) ?? 0}`);
    expect(faltan).toEqual([]);
    expect(subidasNoQueridas).toBeGreaterThanOrEqual(30);
    expect(ordagosNoQueridos).toBeGreaterThanOrEqual(30);
    expect(cuenta.has('grande/ordago')).toBe(false);
  });
});
