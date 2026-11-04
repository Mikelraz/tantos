/** Formatos de tiempo y de marca para la interfaz. */
import { numeroDelDia } from '../juego/diaria';
import type { Marca } from '../juego/tanda';

function partes(decimas: number): { min: number; seg: string; dec: number } {
  const min = Math.floor(decimas / 600);
  const seg = Math.floor((decimas % 600) / 10);
  return { min, seg: String(seg).padStart(2, '0'), dec: decimas % 10 };
}

/** `m:ss`, para el reloj que corre durante la mano. */
export function tiempoCorto(decimas: number): string {
  const { min, seg } = partes(decimas);
  return `${min}:${seg}`;
}

/** `m:ss,d`, para las marcas. */
export function tiempoLargo(decimas: number): string {
  const { min, seg, dec } = partes(decimas);
  return `${min}:${seg},${dec}`;
}

export function textoFallos(n: number): string {
  return n === 1 ? '1 fallo' : `${n} fallos`;
}

/** "0 fallos · 1:15,4". */
export function textoMarca(m: Marca): string {
  return `${textoFallos(m.fallos)} · ${tiempoLargo(m.decimas)}`;
}

/** El texto para mandar al grupo, al estilo de Wordle. El `*` avisa de que se cuenta con otra regla. */
export function textoCompartir(marca: Marca, enlace: string): string {
  const numero = marca.dia ? numeroDelDia(marca.dia) : 0;
  const modo = marca.noQueridosCobrados ? '*' : '';
  const cuadros = marca.manos.map((m) => (m.acierto ? '🟩' : '🟥')).join('');
  return [`Tantos #${numero}${modo} · ${textoMarca(marca)}`, cuadros, enlace].join('\n');
}
