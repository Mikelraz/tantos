/** Cronómetro con pausa; el reloj se inyecta para poder probarlo. */
export class Cronometro {
  private acumuladoMs = 0;
  private inicioTramo: number | null = null;

  constructor(private readonly ahora: () => number) {}

  get enMarcha(): boolean {
    return this.inicioTramo !== null;
  }

  iniciar(): void {
    this.acumuladoMs = 0;
    this.inicioTramo = this.ahora();
  }

  pausar(): void {
    if (this.inicioTramo === null) return;
    this.acumuladoMs += this.ahora() - this.inicioTramo;
    this.inicioTramo = null;
  }

  reanudar(): void {
    if (this.inicioTramo !== null) return;
    this.inicioTramo = this.ahora();
  }

  /** Décimas acumuladas hasta ahora, sin parar el cronómetro (para el reloj en pantalla). */
  leer(): number {
    const tramo = this.inicioTramo === null ? 0 : this.ahora() - this.inicioTramo;
    return Math.floor((this.acumuladoMs + tramo) / 100);
  }

  /** Para el cronómetro y devuelve el tiempo acumulado en décimas de segundo. */
  detener(): number {
    this.pausar();
    const decimas = Math.floor(this.acumuladoMs / 100);
    this.acumuladoMs = 0;
    return decimas;
  }
}
