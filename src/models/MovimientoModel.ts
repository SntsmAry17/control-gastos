import { Movimiento, TipoMovimiento } from "./Movimiento";
import { Presupuesto } from "./Presupuesto";

export class MovimientoModel {
  constructor(
    private movimientos: Movimiento[] = [],
    private presupuestos: Presupuesto[] = []
  ) {}

  getMovimientos(): Movimiento[] { return [...this.movimientos]; }
  getPresupuestos(): Presupuesto[] { return [...this.presupuestos]; }

  addMovimiento(movimiento: Movimiento): void {
    if (this.esDuplicado(movimiento)) throw new Error("Ya existe un movimiento igual en esa fecha.");
    this.movimientos.push(movimiento);
  }

  updateMovimiento(id: string, actualizado: Movimiento): void {
    const indice = this.movimientos.findIndex((movimiento) => movimiento.id === id);
    if (indice < 0) throw new Error("No se encontró el movimiento que editabas.");
    if (this.esDuplicado(actualizado, id)) throw new Error("Ya existe un movimiento igual en esa fecha.");
    this.movimientos[indice] = actualizado;
  }

  deleteMovimiento(id: string): Movimiento | undefined {
    const indice = this.movimientos.findIndex((movimiento) => movimiento.id === id);
    if (indice < 0) return undefined;
    return this.movimientos.splice(indice, 1)[0];
  }

  restaurarMovimiento(movimiento: Movimiento): void { this.movimientos.push(movimiento); }

  guardarPresupuesto(presupuesto: Presupuesto): void {
    const indice = this.presupuestos.findIndex((actual) => actual.mes === presupuesto.mes && actual.categoria.toLocaleLowerCase("es") === presupuesto.categoria.toLocaleLowerCase("es"));
    if (indice < 0) this.presupuestos.push(presupuesto);
    else this.presupuestos[indice] = presupuesto;
  }

  deletePresupuesto(mes: string, categoria: string): Presupuesto | undefined {
    const indice = this.presupuestos.findIndex((actual) => actual.mes === mes
      && actual.categoria.toLocaleLowerCase("es") === categoria.toLocaleLowerCase("es"));
    if (indice < 0) return undefined;
    return this.presupuestos.splice(indice, 1)[0];
  }

  restaurarPresupuesto(presupuesto: Presupuesto): void { this.presupuestos.push(presupuesto); }

  getBalance(mes?: string): number {
    return this.movimientos.filter((movimiento) => !mes || movimiento.fecha.startsWith(mes)).reduce(
      (balance, movimiento) => balance + (movimiento.tipo === "ingreso" ? movimiento.monto : -movimiento.monto), 0
    );
  }

  getTotales(mes?: string): { ingresos: number; gastos: number; balance: number } {
    const movimientos = this.movimientos.filter((movimiento) => !mes || movimiento.fecha.startsWith(mes));
    const ingresos = this.sumarTipo(movimientos, "ingreso");
    const gastos = this.sumarTipo(movimientos, "gasto");
    return { ingresos, gastos, balance: ingresos - gastos };
  }

  getGastosPorCategoria(mes?: string): Array<[string, number]> {
    const gastos = new Map<string, number>();
    for (const movimiento of this.movimientos) {
      if (movimiento.tipo !== "gasto" || (mes && !movimiento.fecha.startsWith(mes))) continue;
      gastos.set(movimiento.categoria, (gastos.get(movimiento.categoria) ?? 0) + movimiento.monto);
    }
    return [...gastos.entries()].sort((a, b) => b[1] - a[1]);
  }

  checkPresupuesto(mes?: string): Array<{ presupuesto: Presupuesto; gastado: number; excedido: boolean }> {
    return this.presupuestos.filter((presupuesto) => !mes || presupuesto.mes === mes).map((presupuesto) => {
      const gastado = this.movimientos.filter((movimiento) => movimiento.tipo === "gasto" && (!mes || movimiento.fecha.startsWith(mes))
        && movimiento.categoria.toLocaleLowerCase("es") === presupuesto.categoria.toLocaleLowerCase("es"))
        .reduce((total, movimiento) => total + movimiento.monto, 0);
      return { presupuesto, gastado, excedido: gastado > presupuesto.monto };
    });
  }

  private esDuplicado(candidato: Movimiento, excluirId?: string): boolean {
    return this.movimientos.some((actual) => actual.id !== excluirId
      && actual.tipo === candidato.tipo
      && actual.monto === candidato.monto
      && actual.fecha === candidato.fecha
      && actual.categoria.toLocaleLowerCase("es") === candidato.categoria.toLocaleLowerCase("es")
      && actual.descripcion.toLocaleLowerCase("es") === candidato.descripcion.toLocaleLowerCase("es"));
  }

  private sumarTipo(movimientos: Movimiento[], tipo: TipoMovimiento): number {
    return movimientos.filter((movimiento) => movimiento.tipo === tipo).reduce((suma, movimiento) => suma + movimiento.monto, 0);
  }
}
