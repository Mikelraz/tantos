/** La aplicación: inicio → 10 manos (con solución al fallar) → fin. Sin framework. */
import { generarMano, type Nivel } from '../generar/generar';
import type { Rng } from '../generar/rng';
import { Cronometro } from '../juego/cronometro';
import { diaDe, manosDelDia, numeroDelDia, tandaDelDia } from '../juego/diaria';
import {
  cargarHistorial,
  cargarModo,
  esNuevaMejor,
  guardarMarca,
  guardarModo,
  marcasDelModo,
  mejorMarca,
} from '../juego/historial';
import { crearMarca, esCorrecta, NIVELES_TANDA, type Marca, type ResultadoMano } from '../juego/tanda';
import { contarMano, type ManoJugada } from '../reglas/contar';
import { boton, h } from './dom';
import { pantallaFin } from './fin';
import { textoCompartir, textoMarca, tiempoCorto } from './formato';
import { graficaMarcas } from './grafica';
import { pantallaMano, type PantallaMano } from './mesa';
import { pantallaSolucion } from './solucion';

export interface OpcionesApp {
  rng: Rng;
  /** Milisegundos de un reloj monótono (`performance.now`). */
  ahora: () => number;
  almacen: Storage | null;
  documento: Document;
  /** La fecha de ahora, para saber qué tanda del día toca. */
  hoy: () => Date;
  /** La dirección de la app, que va al final del texto compartido. */
  enlace: string;
  /** Manda el texto al menú de compartir del sistema o, si no lo hay, lo copia. */
  compartir: (texto: string) => Promise<ResultadoCompartir>;
}

/** `null` si no se pudo, o si se canceló el menú de compartir. */
export type ResultadoCompartir = 'compartido' | 'copiado' | null;

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
  /** Los no queridos se cobran al momento: no entran en la cuenta del final de la mano. */
  let noQueridosCobrados = cargarModo(o.almacen);
  let resultados: ResultadoMano[] = [];
  /** Las manos de la tanda del día, o null en una tanda libre. */
  let delDia: { dia: string; manos: ManoJugada[] } | null = null;
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

  /** Botón que comparte la tanda del día; si el texto se copia, lo dice. */
  function botonCompartir(marca: Marca, clase: string): HTMLButtonElement {
    const b = boton(
      doc,
      'Compartir',
      () => {
        void o.compartir(textoCompartir(marca, o.enlace)).then((r) => {
          if (r === 'copiado') b.textContent = 'Copiado';
        });
      },
      clase,
    );
    return b;
  }

  function inicio(): void {
    manoEnPantalla = null;
    const todas = cargarHistorial(o.almacen);
    const hoy = diaDe(o.hoy());
    const jugadaHoy = tandaDelDia(todas, hoy);
    const historial = marcasDelModo(todas, noQueridosCobrados);
    const mejor = mejorMarca(historial);
    const casilla = h(doc, 'input', {
      type: 'checkbox',
      role: 'switch',
      'data-ajuste': 'noQueridosCobrados',
    });
    casilla.checked = noQueridosCobrados;
    casilla.addEventListener('change', () => {
      noQueridosCobrados = casilla.checked;
      guardarModo(noQueridosCobrados, o.almacen);
      // La mejor marca y la gráfica son las del modo elegido.
      inicio();
    });
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
        h(
          doc,
          'label',
          { class: 'interruptor' },
          casilla,
          h(doc, 'span', { class: 'texto' }, 'No queridos cobrados al momento'),
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
        jugadaHoy
          ? h(
              doc,
              'div',
              { class: 'diaria-hecha' },
              h(
                doc,
                'p',
                {},
                `Tanda del día #${numeroDelDia(hoy)}: `,
                h(doc, 'b', { 'data-dato': 'diaria' }, textoMarca(jugadaHoy)),
              ),
              botonCompartir(jugadaHoy, 'secundario'),
            )
          : boton(doc, 'Tanda del día', () => empezarDelDia(hoy), 'principal'),
        boton(doc, 'Empezar tanda', empezarTanda, jugadaHoy ? 'principal' : 'secundario'),
      ),
    );
  }

  function empezarTanda(): void {
    delDia = null;
    resultados = [];
    siguienteMano(false);
  }

  function empezarDelDia(dia: string): void {
    delDia = { dia, manos: manosDelDia(dia) };
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
    const mano = delDia ? delDia.manos[i]! : generarMano(nivel, o.rng);
    manoEnPantalla = mano;
    const pantalla = pantallaMano(doc, {
      numero: i + 1,
      total: totalManos,
      mano,
      trasAcierto,
      noQueridosCobrados,
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
    const desglose = contarMano(mano, { noQueridosCobrados });
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
        ahora: o.ahora,
      }),
    );
  }

  function fin(): void {
    manoEnPantalla = null;
    const previo = marcasDelModo(cargarHistorial(o.almacen), noQueridosCobrados);
    const marca = crearMarca(resultados, new Date(), noQueridosCobrados, delDia?.dia);
    const nuevaMejor = o.almacen !== null && esNuevaMejor(marca, previo);
    guardarMarca(marca, o.almacen);
    mostrar(
      pantallaFin(doc, {
        marca,
        nuevaMejor,
        mejorPrevia: mejorMarca(previo),
        serie: [...previo, marca],
        alOtra: empezarTanda,
        delDia: marca.dia
          ? { numero: numeroDelDia(marca.dia), compartir: botonCompartir(marca, 'principal') }
          : null,
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
