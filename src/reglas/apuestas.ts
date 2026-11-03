/** Máquina de apuestas de un lance. Port de ordago `engine/betting.py::jugar_lance` (mesa a 0–0). */
import { parejaDe, type Pareja } from './cotejo';

export const TOPE_PUESTA = 40;
export const MIN_ENVIDO = 2;
export const PIEDRA_PASO = 1;
const MAX_ACCIONES = 256;

/** `cantidad` es la puesta acumulada: "5 más" sobre un 2 es 7. */
export type Accion =
  | { tipo: 'paso' }
  | { tipo: 'envido'; cantidad: number }
  | { tipo: 'ordago' }
  | { tipo: 'quiero' }
  | { tipo: 'no_quiero' };

export interface Intervencion {
  puesto: number;
  accion: Accion;
}

export type Resolucion =
  | 'sin_participantes'
  | 'sin_rival'
  | 'en_paso'
  | 'querido'
  | 'no_querido'
  | 'ordago';

export interface EstadoApuesta {
  puesto: number;
  pendiente: number;
  valorRechazo: number;
  frenteAEnvite: boolean;
  frenteAOrdago: boolean;
  historial: readonly Intervencion[];
}

export interface ResultadoApuesta {
  resolucion: Resolucion;
  puesta: number;
  parejaAdjudicada: Pareja | null;
  historial: Intervencion[];
}

function resultado(
  resolucion: Resolucion,
  puesta: number,
  parejaAdjudicada: Pareja | null,
  historial: Intervencion[],
): ResultadoApuesta {
  return { resolucion, puesta, parejaAdjudicada, historial };
}

/** Siguiente participante (cíclico) de la pareja rival a `envidante`. */
function siguienteRival(
  participantes: readonly number[],
  actual: number,
  envidante: Pareja,
): number {
  const n = participantes.length;
  for (let paso = 1; paso <= n; paso++) {
    const i = (actual + paso) % n;
    if (parejaDe(participantes[i] as number) !== envidante) return i;
  }
  throw new Error('el lance no tiene participante rival');
}

export function jugarLance(
  participantes: number[],
  elegir: (e: EstadoApuesta) => Accion,
): ResultadoApuesta {
  if (participantes.length === 0) return resultado('sin_participantes', 0, null, []);
  const presentes = new Set(participantes.map(parejaDe));
  if (presentes.size === 1) {
    return resultado('sin_rival', 0, [...presentes][0] as Pareja, []);
  }

  const historial: Intervencion[] = [];
  let pendiente = 0;
  let valorRechazo = PIEDRA_PASO;
  let ordagoVivo = false;
  let envidante: Pareja | null = null;
  let index = 0;
  let pasos = 0;

  while (historial.length <= MAX_ACCIONES) {
    const puesto = participantes[index] as number;
    const accion = elegir({
      puesto,
      pendiente,
      valorRechazo,
      frenteAEnvite: pendiente > 0,
      frenteAOrdago: ordagoVivo,
      historial: [...historial],
    });
    historial.push({ puesto, accion });

    if (pendiente === 0) {
      switch (accion.tipo) {
        case 'paso':
          pasos++;
          if (pasos === participantes.length) {
            return resultado('en_paso', PIEDRA_PASO, null, historial);
          }
          index = (index + 1) % participantes.length;
          continue;
        case 'envido': {
          const minimo = Math.min(MIN_ENVIDO, TOPE_PUESTA);
          if (accion.cantidad < minimo) {
            throw new Error(
              `el envido de apertura debe ser al menos ${minimo}, el puesto ${puesto} apostó ${accion.cantidad}`,
            );
          }
          pendiente = Math.min(accion.cantidad, TOPE_PUESTA);
          break;
        }
        case 'ordago':
          ordagoVivo = true;
          pendiente = TOPE_PUESTA;
          break;
        default:
          throw new Error(`el puesto ${puesto} no puede decir ${accion.tipo} sin apuesta pendiente`);
      }
    } else {
      switch (accion.tipo) {
        case 'quiero':
          return resultado(ordagoVivo ? 'ordago' : 'querido', pendiente, null, historial);
        case 'no_quiero':
          return resultado('no_querido', valorRechazo, envidante, historial);
        case 'envido': {
          if (ordagoVivo) {
            throw new Error(`el puesto ${puesto} no puede subir un órdago con un envido`);
          }
          if (pendiente >= TOPE_PUESTA) {
            throw new Error(
              `el puesto ${puesto} no puede subir por encima de ${TOPE_PUESTA}; solo un órdago va más allá`,
            );
          }
          const minimo = Math.min(pendiente + MIN_ENVIDO, TOPE_PUESTA);
          if (accion.cantidad < minimo) {
            throw new Error(
              `una subida debe llegar al menos a ${minimo}, el puesto ${puesto} apostó ${accion.cantidad}`,
            );
          }
          valorRechazo = pendiente;
          pendiente = Math.min(accion.cantidad, TOPE_PUESTA);
          break;
        }
        case 'ordago':
          if (ordagoVivo) {
            throw new Error(`el puesto ${puesto} no puede subir un órdago con otro órdago`);
          }
          valorRechazo = pendiente;
          ordagoVivo = true;
          pendiente = TOPE_PUESTA;
          break;
        default:
          throw new Error(`el puesto ${puesto} no puede decir ${accion.tipo} frente a una apuesta`);
      }
    }

    envidante = parejaDe(puesto);
    index = siguienteRival(participantes, index, envidante);
  }
  throw new Error(`el lance no se resolvió en ${MAX_ACCIONES} acciones`);
}

/** Reejecuta un lance con un historial grabado; falla si no encaja exactamente. */
export function reproducirLance(
  participantes: number[],
  historial: readonly Intervencion[],
): ResultadoApuesta {
  let i = 0;
  const r = jugarLance(participantes, (e) => {
    const dado = historial[i];
    if (dado === undefined) {
      throw new Error(`al historial le faltan acciones: habla el puesto ${e.puesto}`);
    }
    if (dado.puesto !== e.puesto) {
      throw new Error(`habla el puesto ${e.puesto}, el historial dice ${dado.puesto}`);
    }
    i++;
    return dado.accion;
  });
  if (i < historial.length) {
    throw new Error(`sobran ${historial.length - i} acciones tras cerrarse el lance`);
  }
  return r;
}
