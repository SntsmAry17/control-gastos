import { Movimiento } from "../models/Movimiento";
import { MovimientoModel } from "../models/MovimientoModel";
import { Presupuesto } from "../models/Presupuesto";
import { StorageService } from "../services/StorageService";
import { DatosFormularioMovimiento, FiltrosMovimiento, MovimientoView } from "../views/MovimientoView";

export class MovimientoController {
  private modelo: MovimientoModel;
  private idEnEdicion: string | null = null;
  private filtros: FiltrosMovimiento = { tipo: "todos", categoria: "", busqueda: "", desde: "", hasta: "" };
  private periodoResumen = "mes";
  private mesResumen = this.obtenerMesActual();
  private mesCompararDesde = "";
  private mesCompararHasta = "";

  constructor(private readonly vista: MovimientoView, private readonly almacenamiento: StorageService) {
    this.modelo = new MovimientoModel(almacenamiento.cargar(), almacenamiento.cargarPresupuestos());
    this.conectarEventos();
    this.actualizarVista();
  }

  private conectarEventos(): void {
    this.vista.alEnviarFormulario((datos) => this.guardar(datos));
    this.vista.alCambiarFiltros((filtros) => this.handleFilter(filtros));
    this.vista.alElegirAccion((accion, id) => accion === "editar" ? this.iniciarEdicion(id) : this.handleDelete(id));
    this.vista.alCancelarEdicion(() => this.cancelarEdicion());
    this.vista.alGuardarPresupuesto((presupuesto) => this.guardarPresupuesto(presupuesto));
    this.vista.alEliminarPresupuesto((mes, categoria) => this.handleDeletePresupuesto(mes, categoria));
    this.vista.alCambiarMes((periodo, mes) => { this.periodoResumen = periodo; if (mes) this.mesResumen = mes; this.actualizarVista(); });
    this.vista.alConfirmarComparacion((desde, hasta) => {
      if (!desde || !hasta) { this.vista.mostrarEstado("Selecciona ambos meses para comparar.", true); return; }
      this.mesCompararDesde = desde;
      this.mesCompararHasta = hasta;
      this.actualizarVista();
    });
    this.vista.alExportarPdf(() => this.vista.prepararPdf());
  }

  private guardar(datos: DatosFormularioMovimiento): void {
    try {
      const anterior = this.idEnEdicion ? this.modelo.getMovimientos().find((m) => m.id === this.idEnEdicion) : undefined;
      const movimiento = new Movimiento(this.idEnEdicion ?? this.crearId(), datos.tipo, datos.monto, datos.categoria, datos.fecha, datos.descripcion);
      if (this.idEnEdicion) this.handleUpdate(this.idEnEdicion, datos);
      else this.modelo.addMovimiento(movimiento);
      try { this.almacenamiento.guardar(this.modelo.getMovimientos()); }
      catch (error) {
        if (anterior) this.modelo.updateMovimiento(anterior.id, anterior);
        else this.modelo.deleteMovimiento(movimiento.id);
        throw error;
      }
      this.idEnEdicion = null;
      this.vista.limpiarFormulario();
      this.vista.mostrarEstado("Movimiento guardado correctamente.");
      this.actualizarVista();
    } catch (error) {
      this.vista.mostrarEstado(error instanceof Error ? error.message : "No se pudo guardar el movimiento.", true);
    }
  }

  handleUpdate(id: string, datos: DatosFormularioMovimiento): void {
    this.modelo.updateMovimiento(id, new Movimiento(id, datos.tipo, datos.monto, datos.categoria, datos.fecha, datos.descripcion));
  }

  handleDelete(id: string): void {
    const movimiento = this.modelo.getMovimientos().find((m) => m.id === id);
    if (!movimiento) return;
    const monto = new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(movimiento.monto);
    if (!window.confirm(`¿Eliminar el ${movimiento.tipo} «${movimiento.categoria}» por ${monto}?`)) return;
    this.modelo.deleteMovimiento(id);
    try {
      this.almacenamiento.guardar(this.modelo.getMovimientos());
      if (this.idEnEdicion === id) { this.idEnEdicion = null; this.vista.limpiarFormulario(); }
      this.vista.mostrarEstado("Movimiento eliminado.");
      this.actualizarVista();
    } catch {
      this.modelo.addMovimiento(movimiento);
      this.vista.mostrarEstado("No se pudo guardar el cambio en el navegador.", true);
    }
  }

  handleFilter(filtros: FiltrosMovimiento): void { this.filtros = filtros; this.actualizarVista(); }

  private guardarPresupuesto(presupuesto: Presupuesto): void {
    const anteriores = this.modelo.getPresupuestos();
    this.modelo.guardarPresupuesto(presupuesto);
    try {
      this.almacenamiento.guardarPresupuestos(this.modelo.getPresupuestos());
      this.vista.mostrarEstado("Presupuesto guardado.");
      this.actualizarVista();
    } catch {
      this.modelo = new MovimientoModel(this.modelo.getMovimientos(), anteriores);
      this.vista.mostrarEstado("No se pudo guardar el presupuesto en el navegador.", true);
    }
  }

  private handleDeletePresupuesto(mes: string, categoria: string): void {
    const presupuesto = this.modelo.getPresupuestos().find((item) => item.mes === mes
      && item.categoria.toLocaleLowerCase("es") === categoria.toLocaleLowerCase("es"));
    if (!presupuesto) return;
    if (!window.confirm(`¿Eliminar el presupuesto de ${categoria} para ${mes}?`)) return;
    this.modelo.deletePresupuesto(mes, categoria);
    try {
      this.almacenamiento.guardarPresupuestos(this.modelo.getPresupuestos());
      this.vista.mostrarEstado("Presupuesto eliminado.");
      this.actualizarVista();
    } catch {
      this.modelo.restaurarPresupuesto(presupuesto);
      this.vista.mostrarEstado("No se pudo guardar el cambio en el navegador.", true);
    }
  }

  private iniciarEdicion(id: string): void {
    const movimiento = this.modelo.getMovimientos().find((m) => m.id === id);
    if (!movimiento) return;
    this.idEnEdicion = id;
    this.vista.prepararEdicion(movimiento);
    this.vista.mostrarEstado(`Editando: ${movimiento.categoria}.`);
  }

  private cancelarEdicion(): void {
    this.idEnEdicion = null;
    this.vista.limpiarFormulario();
    this.vista.mostrarEstado("Edición cancelada.");
  }

  private actualizarVista(): void {
    const movimientos = this.modelo.getMovimientos();
    const mes = this.periodoResumen === "todos" ? undefined : this.mesResumen;
    const resumen = this.modelo.getTotales(mes);
    const visibles = movimientos.filter((m) => (this.filtros.tipo === "todos" || m.tipo === this.filtros.tipo)
      && m.categoria.toLocaleLowerCase("es").includes(this.filtros.categoria.toLocaleLowerCase("es"))
      && `${m.categoria} ${m.descripcion}`.toLocaleLowerCase("es").includes(this.filtros.busqueda.toLocaleLowerCase("es"))
      && (!this.filtros.desde || m.fecha >= this.filtros.desde) && (!this.filtros.hasta || m.fecha <= this.filtros.hasta))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    this.vista.mostrar(visibles, resumen);
    this.vista.renderBalance(this.modelo.getBalance(mes));
    const mesPresupuesto = mes ?? this.obtenerMesActual();
    const estadosPresupuesto = this.modelo.checkPresupuesto();
    this.vista.renderAlertaPresupuesto(this.modelo.getPresupuestos(), movimientos, mesPresupuesto, estadosPresupuesto);
    this.vista.renderGrafico(this.modelo.getGastosPorCategoria(mes));
    this.vista.renderEtiquetaPeriodo(this.periodoResumen, this.mesResumen);
    this.renderComparacion(movimientos);
    const categorias = [...new Set([...movimientos.map((m) => m.categoria), "Comida", "Transporte", "Gastos personales", "Gustos", "Vivienda", "Servicios", "Salud", "Educación", "Entretenimiento", "Trabajo", "Familia", "Ventas", "Inversiones", "Regalo"])].sort((a, b) => a.localeCompare(b, "es"));
    this.vista.renderCategoriasDisponibles(categorias);
  }

  private renderComparacion(movimientos: Movimiento[]): void {
    const resumenMes = (mes: string) => {
      const lista = movimientos.filter((m) => m.fecha.startsWith(mes));
      const ingresos = lista.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
      const gastos = lista.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.monto, 0);
      return { ingresos, gastos, balance: ingresos - gastos };
    };
    this.vista.renderReporte(this.mesCompararDesde, this.mesCompararDesde ? resumenMes(this.mesCompararDesde) : null,
      this.mesCompararHasta, this.mesCompararHasta ? resumenMes(this.mesCompararHasta) : null);
  }

  private obtenerMesActual(): string {
    const fecha = new Date();
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
  }

  private crearId(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
}
