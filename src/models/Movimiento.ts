export type TipoMovimiento = "ingreso" | "gasto";

export class Movimiento {
  constructor(
    public readonly id: string,
    public tipo: TipoMovimiento,
    public monto: number,
    public categoria: string,
    public fecha: string,
    public descripcion = ""
  ) {
    if (!id.trim()) {
      throw new Error("El movimiento necesita un identificador.");
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      throw new Error("El monto debe ser un número mayor que cero.");
    }

    if (!categoria.trim()) {
      throw new Error("La categoría no puede quedar vacía.");
    }

    const fechaInterpretada = new Date(`${fecha}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(fechaInterpretada.getTime()) || fechaInterpretada.toISOString().slice(0, 10) !== fecha) {
      throw new Error("La fecha no es válida.");
    }

    this.categoria = categoria.trim();
    this.descripcion = descripcion.trim();
  }
}
