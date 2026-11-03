import { compararMarcas, type Marca } from './tanda';

export const CLAVE_HISTORIAL = 'tantos.historial.v1';

function esMarca(x: unknown): x is Marca {
  if (typeof x !== 'object' || x === null) return false;
  const m = x as Record<string, unknown>;
  return (
    typeof m.fecha === 'string' &&
    typeof m.fallos === 'number' &&
    typeof m.decimas === 'number' &&
    Array.isArray(m.manos)
  );
}

export function cargarHistorial(almacen: Storage | null): Marca[] {
  if (!almacen) return [];
  try {
    const bruto = almacen.getItem(CLAVE_HISTORIAL);
    if (bruto === null) return [];
    const datos: unknown = JSON.parse(bruto);
    return Array.isArray(datos) && datos.every(esMarca) ? datos : [];
  } catch {
    return [];
  }
}

export function guardarMarca(m: Marca, almacen: Storage | null): void {
  if (!almacen) return;
  try {
    almacen.setItem(CLAVE_HISTORIAL, JSON.stringify([...cargarHistorial(almacen), m]));
  } catch {
    // Sin almacenamiento la app sigue funcionando; solo se pierde el historial.
  }
}

export function mejorMarca(h: Marca[]): Marca | null {
  return h.reduce<Marca | null>((mejor, m) => (mejor && compararMarcas(mejor, m) <= 0 ? mejor : m), null);
}

/** Cierto si `m` supera estrictamente a todas las marcas previas (la primera siempre es récord). */
export function esNuevaMejor(m: Marca, h: Marca[]): boolean {
  const mejor = mejorMarca(h);
  return mejor === null || compararMarcas(m, mejor) < 0;
}
