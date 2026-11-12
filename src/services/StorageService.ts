import { Movimiento, TipoMovimiento } from "../models/Movimiento";
import { Presupuesto } from "../models/Presupuesto";

export class StorageService {
  private readonly clave = "control-gastos-movimientos";
  private readonly clavePresupuestos = "control-gastos-presupuestos";

  guardarPresupuestos(presupuestos: Presupuesto[]): void {
    localStorage.setItem(this.clavePresupuestos, JSON.stringify(presupuestos));
  }

  cargarPresupuestos(): Presupuesto[] {
    try {
      const datos: unknown = JSON.parse(localStorage.getItem(this.clavePresupuestos) ?? "[]");
      if (!Array.isArray(datos)) return [];
      return datos.flatMap((dato) => {
        if (!dato || typeof dato !== "object") return [];
        const registro = dato as Record<string, unknown>;
        try {
          if (typeof registro.mes !== "string" || typeof registro.categoria !== "string" || typeof registro.monto !== "number") return [];
          return [new Presupuesto(registro.mes, registro.categoria, registro.monto)];
        } catch { return []; }
      });
    } catch { return []; }
  }

  guardar(movimientos: Movimiento[]): void {
    const texto = JSON.stringify(movimientos);
    localStorage.setItem(this.clave, texto);
  }

  cargar(): Movimiento[] {
    const texto = localStorage.getItem(this.clave);

    if (texto === null) {
      return [];
    }

    try {
      const datos: unknown = JSON.parse(texto);

      if (!Array.isArray(datos)) {
        return [];
      }

      const movimientos: Movimiento[] = [];

      for (const dato of datos) {
        if (typeof dato !== "object" || dato === null) {
          continue;
        }

        const registro = dato as Record<string, unknown>;
        const id = registro["id"];
        const tipo = registro["tipo"];
        const monto = registro["monto"];
        const categoria = registro["categoria"];
        const fecha = registro["fecha"];
        const descripcion = registro["descripcion"];

        if (
          typeof id !== "string" ||
          (tipo !== "ingreso" && tipo !== "gasto") ||
          typeof monto !== "number" ||
          typeof categoria !== "string" ||
          typeof fecha !== "string"
        ) {
          continue;
        }

        try {
          movimientos.push(
            new Movimiento(id, tipo as TipoMovimiento, monto, categoria, fecha, typeof descripcion === "string" ? descripcion : "")
          );
        } catch {}
      }

      return movimientos;
    } catch {
      return [];
    }
  }
}
