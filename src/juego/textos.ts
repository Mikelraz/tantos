/** Textos de la mesa: nombres, líneas de envite y explicación de cada cobro. */
import { totalJugada, type Carta, type Jugada, type Rango } from '../reglas/cartas';
import type { CobroLance, LanceJugado, ManoJugada } from '../reglas/contar';
import {
  claveLance,
  ganadorCotejo,
  parejaDe,
  participantes,
  type Pareja,
} from '../reglas/cotejo';
import {
  claveJuego,
  clavePares,
  compararClaves,
  tantosJuego,
  tantosPares,
  type JugadaPares,
  type Lance,
} from '../reglas/evaluar';

export const NOMBRE_PAREJA = ['Nosotros', 'Ellos'] as const;

export type Posicion = 'abajo' | 'derecha' | 'arriba' | 'izquierda';

const POSICIONES: readonly Posicion[] = ['abajo', 'derecha', 'arriba', 'izquierda'];
const ETIQUETAS = ['Tú', 'Rival', 'Compañero', 'Rival'] as const;
const NOMBRE_LANCE: Record<Lance, string> = {
  grande: 'Grande',
  chica: 'Chica',
  pares: 'Pares',
  juego: 'Juego',
  punto: 'Punto',
};
const SEPARADOR = ' · ';

export function posicionEnPantalla(puesto: number): Posicion {
  return POSICIONES[puesto] as Posicion;
}

export function etiquetaPuesto(puesto: number): string {
  return ETIQUETAS[puesto] as string;
}

const SIMBOLO_RANGO: Record<Rango, string> = {
  1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 10: 'S', 11: 'C', 12: 'R',
};

export function simbolo(c: Carta): string {
  return SIMBOLO_RANGO[c.rango];
}

/** Símbolo de una fuerza ordinal (As 1 ... Rey 10): de 8 en adelante son S, C, R. */
function simboloDeFuerza(f: number): string {
  return f >= 8 ? SIMBOLO_RANGO[(f + 2) as Rango] : String(f);
}

export function lineaLance(l: LanceJugado): string {
  const partes: string[] = [];
  let pendiente = 0;
  for (const { puesto, accion } of l.historial) {
    const pareja = NOMBRE_PAREJA[parejaDe(puesto)];
    switch (accion.tipo) {
      case 'paso':
        break;
      case 'envido':
        partes.push(
          pendiente === 0
            ? `${pareja} envido ${accion.cantidad}`
            : `${pareja} ${accion.cantidad - pendiente} más`,
        );
        pendiente = accion.cantidad;
        break;
      case 'ordago':
        partes.push(`${pareja} órdago`);
        pendiente = Number.POSITIVE_INFINITY;
        break;
      case 'quiero':
        partes.push(`${pareja} quiero`);
        break;
      case 'no_quiero':
        partes.push(`${pareja} no quiero`);
        break;
    }
  }
  return `${NOMBRE_LANCE[l.lance]}: ${partes.length === 0 ? 'sin envite' : partes.join(SEPARADOR)}`;
}

function describirPares(p: JugadaPares): string {
  const [a, b] = p.rangos.map(simboloDeFuerza);
  if (p.categoria === 1) return `pareja de ${a}`;
  if (p.categoria === 2) return `medias de ${a}`;
  return `duples de ${a} y ${b}`;
}

/** Cómo se ve una jugada en el cotejo de un lance. */
function describirJugada(lance: Lance, j: Jugada): string {
  switch (lance) {
    case 'grande':
      return [...j].sort((a, b) => ordenFuerza(b) - ordenFuerza(a)).map(simbolo).join('');
    case 'chica':
      return [...j].sort((a, b) => ordenFuerza(a) - ordenFuerza(b)).map(simbolo).join('');
    case 'pares':
      return describirPares(clavePares(j) as JugadaPares);
    case 'juego':
      return String((claveJuego(j) as { total: number }).total);
    case 'punto':
      return `punto ${totalJugada(j)}`;
  }
}

function ordenFuerza(c: Carta): number {
  return c.rango >= 10 ? c.rango - 2 : c.rango;
}

function cotejo(c: CobroLance, m: ManoJugada): string {
  const quienes = participantes(c.lance, m.jugadas, m.mano);
  const ganador = c.puestoGanador as number;
  const rivales = quienes.filter((s) => parejaDe(s) !== parejaDe(ganador));
  const mejor = ganadorCotejo(c.lance, m.jugadas, rivales, m.mano);
  const claveG = claveLance(c.lance, m.jugadas[ganador] as Jugada);
  const claveR = claveLance(c.lance, m.jugadas[mejor] as Jugada);
  const empate =
    claveG !== null && claveR !== null && compararClaves(claveG, claveR) === 0
      ? ' (empate: más cerca de la mano)'
      : '';
  return `${describirJugada(c.lance, m.jugadas[ganador] as Jugada)} gana a ${describirJugada(
    c.lance,
    m.jugadas[mejor] as Jugada,
  )}${empate}`;
}

function tantosTexto(c: CobroLance, m: ManoJugada): string | null {
  if (c.lance === 'punto') return c.ganador === null ? null : 'punto 1';
  if (c.puestosTantos.length === 0) return null;
  const partes = c.puestosTantos.map((s) => {
    const j = m.jugadas[s] as Jugada;
    if (c.lance === 'pares') {
      const p = clavePares(j) as JugadaPares;
      return `${describirPares(p)} ${tantosPares(p)}`;
    }
    const g = claveJuego(j) as { total: number; fuerza: number };
    return `${g.total} vale ${tantosJuego(g)}`;
  });
  return partes.join(' + ');
}

export function explicarLance(c: CobroLance, m: ManoJugada): string {
  if (c.resultado.resolucion === 'sin_participantes') {
    return `nadie tiene ${c.lance}`;
  }
  const partes: string[] = [];
  const ganador = c.ganador as Pareja;
  const monto = c.apuesta[ganador];
  if (c.puestoGanador !== null) partes.push(cotejo(c, m));
  switch (c.resultado.resolucion) {
    case 'en_paso':
      if (monto > 0) partes.push(`en paso ${monto}`);
      break;
    case 'querido':
      partes.push(`envite querido ${monto}`);
      break;
    case 'no_querido':
      partes.push(`no quiero → ${monto}`);
      break;
    case 'sin_rival':
      partes.push(`solo ${NOMBRE_PAREJA[ganador]}`);
      break;
  }
  const tantos = tantosTexto(c, m);
  if (tantos !== null) partes.push(tantos);
  return partes.join(SEPARADOR);
}

export function cartasDecisivas(c: CobroLance): number[] {
  const todos = c.puestoGanador === null ? c.puestosTantos : [c.puestoGanador, ...c.puestosTantos];
  return [...new Set(todos)];
}
