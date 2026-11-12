export class Presupuesto {
  constructor(
    public readonly mes: string,
    public readonly categoria: string,
    public readonly monto: number
  ) {
    if (!/^\d{4}-\d{2}$/.test(mes) || Number.isNaN(Date.parse(`${mes}-01`))) {
      throw new Error("Selecciona un mes válido para el presupuesto.");
    }
    if (!categoria.trim()) throw new Error("La categoría no puede quedar vacía.");
    if (!Number.isFinite(monto) || monto <= 0) throw new Error("El presupuesto debe ser mayor que cero.");
    this.categoria = categoria.trim();
  }
}
