/** La aplicación: inicio → 10 manos (con solución al fallar) → fin. Sin framework. */
import { generarMano, type Nivel } from '../generar/generar';
import type { Rng } from '../generar/rng';
import { Cronometro } from '../juego/cronometro';
import { cargarHistorial, esNuevaMejor, guardarMarca, mejorMarca } from '../juego/historial';
import { crearMarca, esCorrecta, NIVELES_TANDA, type ResultadoMano } from '../juego/tanda';
import { contarMano, type ManoJugada } from '../reglas/contar';
import { boton, h } from './dom';
import { pantallaFin } from './fin';
import { textoMarca, tiempoCorto } from './formato';
import { graficaMarcas } from './grafica';
import { pantallaMano, type PantallaMano } from './mesa';
import { pantallaSolucion } from './solucion';

export interface OpcionesApp {
  rng: Rng;
  /** Milisegundos de un reloj monótono (`performance.now`). */
  ahora: () => number;
  almacen: Storage | null;
  documento: Document;
}

export interface App {
  /** La mano que está en pantalla (en la mesa o en la solución), o null fuera de una tanda. */
  manoActual(): ManoJugada | null;
}

/** Cada cuánto se repinta el reloj de la mano. */
const REFRESCO_RELOJ_MS = 200;

export function montarApp(raiz: HTMLElement, o: OpcionesApp): App {
  const doc = o.documento;
  const cronometro = new Cronometro(o.ahora);
  const totalManos = NIVELES_TANDA.length;

  let manoEnPantalla: ManoJugada | null = null;
  let resultados: ResultadoMano[] = [];
  /** La pantalla de mano activa: solo en ella corre el reloj y se puede pausar. */
  let enJuego: PantallaMano | null = null;
  let capaPausa: HTMLElement | null = null;
  let refresco: ReturnType<typeof setInterval> | null = null;

  function mostrar(pantalla: HTMLElement): void {
    if (refresco !== null) clearInterval(refresco);
    refresco = null;
    enJuego = null;
    capaPausa = null;
    raiz.replaceChildren(pantalla);
    raiz.scrollTop = 0;
    doc.defaultView?.scrollTo?.(0, 0);
  }

  function inicio(): void {
    manoEnPantalla = null;
    const historial = cargarHistorial(o.almacen);
    const mejor = mejorMarca(historial);
    mostrar(
      h(
        doc,
        'main',
        { class: 'pantalla pantalla-inicio' },
        h(doc, 'h1', { class: 'logo' }, 'Tantos'),
        h(doc, 'p', { class: 'lema' }, 'Cuenta los tantos de cada pareja en una mano de mus ya jugada.'),
        h(
          doc,
          'ul',
          { class: 'reglas' },
          h(doc, 'li', {}, `${totalManos} manos, de más fáciles a más difíciles.`),
          h(doc, 'li', {}, 'Gana quien menos falla; a igualdad de fallos, quien tarda menos.'),
          h(doc, 'li', {}, 'Cuatro reyes, reglamento navarro.'),
        ),
        mejor
          ? h(
              doc,
              'p',
              { class: 'mejor' },
              'Mejor marca: ',
              h(doc, 'b', { 'data-dato': 'mejor' }, textoMarca(mejor)),
            )
          : null,
        historial.length > 1 ? graficaMarcas(doc, historial) : null,
        boton(doc, 'Empezar tanda', empezarTanda, 'principal'),
      ),
    );
  }

  function empezarTanda(): void {
    resultados = [];
    siguienteMano(false);
  }

  function siguienteMano(trasAcierto: boolean): void {
    const i = resultados.length;
    const nivel = NIVELES_TANDA[i];
    if (nivel === undefined) {
      fin();
      return;
    }
    const mano = generarMano(nivel, o.rng);
    manoEnPantalla = mano;
    const pantalla = pantallaMano(doc, {
      numero: i + 1,
      total: totalManos,
      mano,
      trasAcierto,
      alComprobar: (respuesta) => comprobar(mano, nivel, respuesta),
    });
    mostrar(pantalla.elemento);
    enJuego = pantalla;
    // El reloj arranca cuando aparecen las cartas.
    cronometro.iniciar();
    refresco = setInterval(() => {
      pantalla.reloj.textContent = tiempoCorto(cronometro.leer());
    }, REFRESCO_RELOJ_MS);
  }

  function comprobar(mano: ManoJugada, nivel: Nivel, respuesta: [number, number]): void {
    if (capaPausa !== null) return;
    const decimas = cronometro.detener();
    const desglose = contarMano(mano);
    const acierto = esCorrecta(respuesta, desglose);
    resultados.push({ nivel, acierto, decimas });
    if (acierto) {
      siguienteMano(true);
      return;
    }
    // El cronómetro ya está parado: el tiempo en la solución no cuenta.
    mostrar(
      pantallaSolucion(doc, {
        numero: resultados.length,
        total: totalManos,
        mano,
        desglose,
        respuesta,
        decimas,
        alSeguir: () => siguienteMano(false),
      }),
    );
  }

  function fin(): void {
    manoEnPantalla = null;
    const previo = cargarHistorial(o.almacen);
    const marca = crearMarca(resultados, new Date());
    const nuevaMejor = esNuevaMejor(marca, previo);
    guardarMarca(marca, o.almacen);
    mostrar(
      pantallaFin(doc, {
        marca,
        nuevaMejor,
        mejorPrevia: mejorMarca(previo),
        serie: [...previo, marca],
        alOtra: empezarTanda,
      }),
    );
  }

  /** Al pasar a segundo plano se para el reloj y se tapan las cartas hasta que se toque. */
  function pausar(): void {
    if (enJuego === null || capaPausa !== null) return;
    cronometro.pausar();
    enJuego.tapar(true);
    const capa = h(
      doc,
      'button',
      { type: 'button', class: 'capa-pausa' },
      h(doc, 'span', { class: 'titulo' }, 'En pausa'),
      h(doc, 'span', { class: 'accion' }, 'Toca para seguir'),
    );
    capa.addEventListener('click', () => {
      if (enJuego === null) return;
      capa.remove();
      capaPausa = null;
      enJuego.tapar(false);
      cronometro.reanudar();
    });
    capaPausa = capa;
    raiz.append(capa);
  }

  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'hidden') pausar();
  });

  inicio();
  return { manoActual: () => manoEnPantalla };
}
