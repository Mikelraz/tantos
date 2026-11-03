/**
 * Contador de una mano ya jugada. Port de ordago `engine/game.py::_liquidar_cotejos` +
 * `scoring.py` con `paso_paga_en_jugada=False`.
 */
import type { Jugada } from './cartas';
import { reproducirLance, type Intervencion, type ResultadoApuesta } from './apuestas';
import {
  ganadorCotejo,
  lancesDeLaMano,
  parejaDe,
  participantes,
  type Jugadas,
  type Pareja,
} from './cotejo';
import { claveJuego, clavePares, tantosJuego, tantosPares, type Lance } from './evaluar';

export interface LanceJugado {
  lance: Lance;
  historial: Intervencion[];
}

export interface ManoJugada {
  jugadas: Jugadas;
  mano: number;
  lances: LanceJugado[];
}

/** `apuesta`: piedras de envite o paso. `tantos`: los de las cartas. Van separados a propósito. */
export interface CobroLance {
  lance: Lance;
  resultado: ResultadoApuesta;
  ganador: Pareja | null;
  /** Solo tiene valor cuando decidió el cotejo. */
  puestoGanador: number | null;
  apuesta: [number, number];
  tantos: [number, number];
  /** Asientos cuyos pares o juego cobraron. */
  puestosTantos: number[];
}

export interface Desglose {
  lances: CobroLance[];
  total: [number, number];
}

function paraPareja(p: Pareja, n: number): [number, number] {
  return p === 0 ? [n, 0] : [0, n];
}

function tantosDeJugada(lance: Lance, j: Jugada): number {
  if (lance === 'pares') {
    const p = clavePares(j);
    return p === null ? 0 : tantosPares(p);
  }
  if (lance === 'juego') {
    const g = claveJuego(j);
    return g === null ? 0 : tantosJuego(g);
  }
  return 0;
}

function cobrarLance(m: ManoJugada, { lance, historial }: LanceJugado): CobroLance {
  const quienes = participantes(lance, m.jugadas, m.mano);
  const resultado = reproducirLance(quienes, historial);

  let ganador: Pareja | null = null;
  let puestoGanador: number | null = null;
  let puesta = 0;
  switch (resultado.resolucion) {
    case 'sin_participantes':
      break;
    case 'sin_rival':
    case 'no_querido':
      ganador = resultado.parejaAdjudicada;
      puesta = resultado.puesta;
      break;
    case 'en_paso':
      puestoGanador = ganadorCotejo(lance, m.jugadas, quienes, m.mano);
      ganador = parejaDe(puestoGanador);
      // En paso solo grande y chica pagan la piedra; pares, juego y punto pagan solo tantos.
      puesta = lance === 'grande' || lance === 'chica' ? resultado.puesta : 0;
      break;
    case 'querido':
      puestoGanador = ganadorCotejo(lance, m.jugadas, quienes, m.mano);
      ganador = parejaDe(puestoGanador);
      puesta = resultado.puesta;
      break;
    case 'ordago':
      throw new Error('un órdago querido no se puede contar: decide la partida');
  }
  if (ganador === null) {
    return {
      lance,
      resultado,
      ganador,
      puestoGanador,
      apuesta: [0, 0],
      tantos: [0, 0],
      puestosTantos: [],
    };
  }

  let tantos = 0;
  let puestosTantos: number[] = [];
  if (lance === 'punto') {
    tantos = 1;
  } else if (lance === 'pares' || lance === 'juego') {
    puestosTantos = quienes.filter((s) => parejaDe(s) === ganador);
    tantos = puestosTantos.reduce((a, s) => a + tantosDeJugada(lance, m.jugadas[s] as Jugada), 0);
  }
  return {
    lance,
    resultado,
    ganador,
    puestoGanador,
    apuesta: paraPareja(ganador, puesta),
    tantos: paraPareja(ganador, tantos),
    puestosTantos,
  };
}

export function contarMano(m: ManoJugada): Desglose {
  const esperados = lancesDeLaMano(m.jugadas);
  if (m.lances.length !== esperados.length || m.lances.some((l, i) => l.lance !== esperados[i])) {
    throw new Error(`los lances de la mano deben ser ${esperados.join(', ')}`);
  }
  const lances = m.lances.map((l) => cobrarLance(m, l));
  const total: [number, number] = [0, 0];
  for (const c of lances) {
    for (const p of [0, 1] as const) total[p] += c.apuesta[p] + c.tantos[p];
  }
  return { lances, total };
}
