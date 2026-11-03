/** Generador pseudoaleatorio sembrado, para que una misma semilla dé la misma mano. */

/** Devuelve un número en [0, 1). */
export type Rng = () => number;

/** mulberry32. */
export function rngSembrado(semilla: number): Rng {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
