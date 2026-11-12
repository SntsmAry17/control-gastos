import { Movimiento, TipoMovimiento } from "../models/Movimiento";
import { Presupuesto } from "../models/Presupuesto";

export interface DatosFormularioMovimiento {
  tipo: TipoMovimiento;
  monto: number;
  categoria: string;
  fecha: string;
  descripcion: string;
}

export interface FiltrosMovimiento {
  tipo: "todos" | TipoMovimiento;
  categoria: string;
  busqueda: string;
  desde: string;
  hasta: string;
}

export interface ResumenMovimiento {
  ingresos: number;
  gastos: number;
  balance: number;
}

export class MovimientoView {
  private readonly formulario = this.obtener<HTMLFormElement>("formulario-movimiento");
  private readonly campoTipo = this.obtener<HTMLSelectElement>("tipo");
  private readonly campoMonto = this.obtener<HTMLInputElement>("monto");
  private readonly campoCategoria = this.obtener<HTMLSelectElement>("categoria");
  private readonly campoCategoriaOtro = this.obtener<HTMLInputElement>("categoria-otro");
  private readonly campoDescripcion = this.obtener<HTMLInputElement>("descripcion");
  private readonly campoFecha = this.obtener<HTMLInputElement>("fecha");
  private readonly botonGuardar = this.formulario.querySelector<HTMLButtonElement>(
    'button[type="submit"]'
  );
  private readonly botonCancelar = this.obtener<HTMLButtonElement>("cancelar-edicion");
  private readonly filtroTipo = this.obtener<HTMLSelectElement>("filtro-tipo");
  private readonly filtroCategoria = this.obtener<HTMLSelectElement>("filtro-categoria");
  private readonly busquedaMovimientos = this.obtener<HTMLInputElement>("busqueda-movimientos");
  private readonly filtroDesde = this.obtener<HTMLInputElement>("filtro-desde");
  private readonly filtroHasta = this.obtener<HTMLInputElement>("filtro-hasta");
  private readonly lista = this.obtener<HTMLUListElement>("lista-movimientos");
  private readonly mensajeVacio = this.obtener<HTMLParagraphElement>("mensaje-vacio");
  private readonly totalIngresos = this.obtener<HTMLElement>("total-ingresos");
  private readonly totalGastos = this.obtener<HTMLElement>("total-gastos");
  private readonly balance = this.obtener<HTMLElement>("balance");
  private readonly mensajeEstado = this.obtener<HTMLParagraphElement>("mensaje-estado");
  private readonly formularioPresupuesto = this.obtener<HTMLFormElement>("formulario-presupuesto");
  private readonly campoPresupuestoMes = this.obtener<HTMLInputElement>("presupuesto-mes");
  private readonly campoPresupuestoCategoria = this.obtener<HTMLSelectElement>("presupuesto-categoria");
  private readonly campoPresupuestoOtro = this.obtener<HTMLInputElement>("presupuesto-categoria-otro");
  private readonly campoPresupuestoMonto = this.obtener<HTMLInputElement>("presupuesto-monto");
  private readonly listaPresupuestos = this.obtener<HTMLDivElement>("lista-presupuestos");
  private readonly filtroPresupuestoMes = this.obtener<HTMLSelectElement>("filtro-presupuesto-mes");
  private readonly periodoResumen = this.obtener<HTMLSelectElement>("periodo-resumen");
  private readonly mesResumen = this.obtener<HTMLInputElement>("mes-resumen");
  private readonly mesCompararDesde = this.obtener<HTMLInputElement>("mes-comparar-desde");
  private readonly mesCompararHasta = this.obtener<HTMLInputElement>("mes-comparar-hasta");
  private readonly comparacionMensual = this.obtener<HTMLDivElement>("comparacion-mensual");
  private readonly graficoGastos = this.obtener<HTMLDivElement>("grafico-gastos");
  private readonly botonPdf = this.obtener<HTMLButtonElement>("exportar-pdf");
  private readonly botonConfirmarComparacion = this.obtener<HTMLButtonElement>("confirmar-comparacion");
  private readonly periodoResumenEtiqueta = this.obtener<HTMLParagraphElement>("periodo-resumen-etiqueta");
  private temporizadorMensaje: number | undefined;

  private readonly formatoDinero = new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
  });

  constructor() {
    const hoy = new Date();
    const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    const mesActual = fechaLocal.slice(0, 7);
    this.campoFecha.value = fechaLocal;
    this.campoPresupuestoMes.value = mesActual;
    this.periodoResumen.value = "mes";
    this.mesResumen.value = mesActual;
    this.mesCompararHasta.value = mesActual;
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    this.mesCompararDesde.value = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, "0")}`;
    this.actualizarOpcionesCategoria();
    // Evita que la rueda/gesto de desplazamiento cambie accidentalmente los montos.
    for (const campo of [this.campoMonto, this.campoPresupuestoMonto]) {
      campo.addEventListener("wheel", (evento) => evento.preventDefault(), { passive: false });
    }
    this.campoTipo.addEventListener("change", () => this.actualizarOpcionesCategoria());
    this.campoCategoria.addEventListener("change", () => { this.campoCategoriaOtro.hidden = this.campoCategoria.value !== "otro"; });
    this.campoPresupuestoCategoria.addEventListener("change", () => { this.campoPresupuestoOtro.hidden = this.campoPresupuestoCategoria.value !== "otro"; });
  }

  private actualizarOpcionesCategoria(): void {
    const opciones = this.campoTipo.value === "ingreso"
      ? ["Trabajo", "Familia", "Ventas", "Inversiones", "Regalo"]
      : ["Comida", "Transporte", "Gastos personales", "Gustos", "Vivienda", "Servicios", "Salud", "Educación", "Entretenimiento"];
    const anterior = this.campoCategoria.value;
    this.campoCategoria.replaceChildren(...opciones.map((nombre) => new Option(nombre, nombre.toLocaleLowerCase("es"))));
    this.campoCategoria.add(new Option("Otro", "otro"));
    if ([...this.campoCategoria.options].some((opcion) => opcion.value === anterior)) this.campoCategoria.value = anterior;
    this.campoCategoriaOtro.hidden = this.campoCategoria.value !== "otro";
  }

  private obtener<T extends HTMLElement>(id: string): T {
    const elemento = document.getElementById(id);
    if (!elemento) {
      throw new Error(`No se encontró el elemento HTML con id "${id}".`);
    }
    return elemento as T;
  }

  alEnviarFormulario(handler: (datos: DatosFormularioMovimiento) => void): void {
    this.formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();

      handler({
        tipo: this.campoTipo.value as TipoMovimiento,
        monto: Number(this.campoMonto.value),
        categoria: this.campoCategoria.value === "otro" ? this.campoCategoriaOtro.value : this.campoCategoria.selectedOptions[0]?.textContent ?? "",
        fecha: this.campoFecha.value,
        descripcion: this.campoDescripcion.value,
      });
    });
  }

  alCambiarFiltros(handler: (filtros: FiltrosMovimiento) => void): void {
    const notificarCambio = () => {
      handler(this.obtenerFiltros());
    };

    this.filtroTipo.addEventListener("change", notificarCambio);
    this.filtroCategoria.addEventListener("change", notificarCambio);
    this.busquedaMovimientos.addEventListener("input", notificarCambio);
    this.filtroDesde.addEventListener("change", notificarCambio);
    this.filtroHasta.addEventListener("change", notificarCambio);
  }

  alElegirAccion(
    handler: (accion: "editar" | "eliminar", id: string) => void
  ): void {
    this.lista.addEventListener("click", (evento) => {
      const objetivo = evento.target;
      if (!(objetivo instanceof Element)) return;

      const boton = objetivo.closest<HTMLButtonElement>("button[data-accion]");
      if (!boton || !boton.dataset.id) return;

      const accion = boton.dataset.accion;
      if (accion === "editar" || accion === "eliminar") {
        handler(accion, boton.dataset.id);
      }
    });
  }

  alCancelarEdicion(handler: () => void): void {
    this.botonCancelar.addEventListener("click", handler);
  }

  obtenerFiltros(): FiltrosMovimiento {
    return {
      tipo: this.filtroTipo.value as FiltrosMovimiento["tipo"],
      categoria: this.filtroCategoria.value.trim(),
      busqueda: this.busquedaMovimientos.value.trim(),
      desde: this.filtroDesde.value,
      hasta: this.filtroHasta.value,
    };
  }

  alGuardarPresupuesto(handler: (presupuesto: Presupuesto) => void): void {
    this.formularioPresupuesto.addEventListener("submit", (evento) => {
      evento.preventDefault();
      try {
        const categoria = this.campoPresupuestoCategoria.value === "otro" ? this.campoPresupuestoOtro.value : this.campoPresupuestoCategoria.selectedOptions[0]?.textContent ?? "";
        handler(new Presupuesto(this.campoPresupuestoMes.value, categoria, Number(this.campoPresupuestoMonto.value)));
        this.formularioPresupuesto.reset();
      } catch (error) { this.mostrarEstado(error instanceof Error ? error.message : "Presupuesto inválido.", true); }
    });
  }

  alEliminarPresupuesto(handler: (mes: string, categoria: string) => void): void {
    this.listaPresupuestos.addEventListener("click", (evento) => {
      const objetivo = evento.target;
      if (!(objetivo instanceof Element)) return;
      const boton = objetivo.closest<HTMLButtonElement>("button[data-eliminar-presupuesto]");
      if (boton?.dataset.mes && boton.dataset.categoria) handler(boton.dataset.mes, boton.dataset.categoria);
    });
  }

  alCambiarMes(handler: (periodo: string, mes: string) => void): void {
    const cambio = () => handler(this.periodoResumen.value, this.mesResumen.value);
    this.periodoResumen.addEventListener("change", cambio);
    this.mesResumen.addEventListener("change", cambio);
  }

  renderCategoriasDisponibles(categorias: string[]): void {
    const seleccionada = this.filtroCategoria.value;
    this.filtroCategoria.replaceChildren(new Option("Todas las categorías", ""), ...categorias.map((categoria) => new Option(categoria, categoria)));
    this.filtroCategoria.value = categorias.includes(seleccionada) ? seleccionada : "";
  }

  alConfirmarComparacion(handler: (desde: string, hasta: string) => void): void {
    this.botonConfirmarComparacion.addEventListener("click", () => handler(this.mesCompararDesde.value, this.mesCompararHasta.value));
  }

  alExportarPdf(handler: () => void): void { this.botonPdf.addEventListener("click", handler); }

  mostrar(movimientos: Movimiento[], resumen: ResumenMovimiento): void {
    this.totalIngresos.textContent = this.formatoDinero.format(resumen.ingresos);
    this.totalGastos.textContent = this.formatoDinero.format(resumen.gastos);
    this.balance.textContent = this.formatoDinero.format(resumen.balance);
    this.balance.classList.toggle("balance-negativo", resumen.balance < 0);

    this.lista.replaceChildren();
    this.mensajeVacio.hidden = movimientos.length > 0;

    for (const movimiento of movimientos) {
      this.lista.append(this.crearElementoMovimiento(movimiento));
    }
  }

  renderBalance(balance: number): void {
    this.balance.textContent = this.formatoDinero.format(balance);
    this.balance.classList.toggle("balance-negativo", balance < 0);
  }

  renderAlertaPresupuesto(presupuestos: Presupuesto[], movimientos: Movimiento[], mes: string, estados: Array<{ presupuesto: Presupuesto; gastado: number; excedido: boolean }>): void {
    this.listaPresupuestos.replaceChildren();
    const meses = [...new Set([mes, ...presupuestos.map((p) => p.mes)])].sort((a, b) => b.localeCompare(a));
    const mesSeleccionado = this.filtroPresupuestoMes.value || mes;
    this.filtroPresupuestoMes.replaceChildren(...meses.map((valor) => new Option(this.nombreMes(valor), valor)), new Option("Todos los meses", "todos"));
    this.filtroPresupuestoMes.value = meses.includes(mesSeleccionado) || mesSeleccionado === "todos" ? mesSeleccionado : mes;
    this.filtroPresupuestoMes.onchange = () => this.renderAlertaPresupuesto(presupuestos, movimientos, mes, estados);
    const presupuestosVisibles = this.filtroPresupuestoMes.value === "todos" ? presupuestos : presupuestos.filter((p) => p.mes === this.filtroPresupuestoMes.value);
    for (const presupuesto of presupuestosVisibles) {
      const estado = estados.find((item) => item.presupuesto.mes === presupuesto.mes && item.presupuesto.categoria.toLocaleLowerCase("es") === presupuesto.categoria.toLocaleLowerCase("es"));
      const gastado = estado?.gastado ?? 0;
      const linea = document.createElement("article"); linea.className = "tarjeta-presupuesto";
      const titulo = document.createElement("strong"); titulo.textContent = presupuesto.categoria;
      const detalle = document.createElement("span"); detalle.className = "presupuesto-detalle"; detalle.textContent = `Presupuesto ${this.formatoDinero.format(presupuesto.monto)} · Gastado ${this.formatoDinero.format(gastado)} (${Math.round(gastado / presupuesto.monto * 100)}%)`;
      const progreso = document.createElement("progress"); progreso.max = 100; progreso.value = Math.min(100, gastado / presupuesto.monto * 100); progreso.setAttribute("aria-label", `Uso del presupuesto de ${presupuesto.categoria}`);
      const mesPresupuesto = document.createElement("span"); mesPresupuesto.className = "mes-presupuesto"; mesPresupuesto.textContent = this.nombreMes(presupuesto.mes);
      linea.append(titulo, detalle, progreso);
      if (estado?.excedido && (this.filtroPresupuestoMes.value === "todos" || presupuesto.mes === this.filtroPresupuestoMes.value)) {
        const alerta = document.createElement("p"); alerta.className = "alerta-presupuesto";
        alerta.textContent = `Presupuesto superado en ${presupuesto.categoria}: ${this.formatoDinero.format(gastado - presupuesto.monto)} por encima del límite.`;
        linea.append(alerta);
      }
      const eliminar = document.createElement("button"); eliminar.type = "button"; eliminar.className = "eliminar-presupuesto";
      eliminar.dataset.eliminarPresupuesto = "true"; eliminar.dataset.mes = presupuesto.mes; eliminar.dataset.categoria = presupuesto.categoria;
      eliminar.textContent = "Eliminar"; eliminar.setAttribute("aria-label", `Eliminar presupuesto de ${presupuesto.categoria} de ${this.nombreMes(presupuesto.mes)}`);
      linea.append(eliminar, mesPresupuesto);
      this.listaPresupuestos.append(linea);
    }
  }

  renderGrafico(datos: Array<[string, number]>): void {
    this.graficoGastos.replaceChildren();
    const maximo = Math.max(0, ...datos.map(([, monto]) => monto));
    for (const [categoria, monto] of datos) {
      const fila = document.createElement("div"); fila.className = "barra-fila";
      const etiqueta = document.createElement("span"); etiqueta.textContent = categoria;
      const barra = document.createElement("div"); barra.className = "barra-fondo";
      const relleno = document.createElement("div"); relleno.className = "barra-relleno"; relleno.style.width = `${maximo ? monto / maximo * 100 : 0}%`;
      barra.append(relleno);
      const valor = document.createElement("strong"); valor.textContent = this.formatoDinero.format(monto);
      fila.append(etiqueta, barra, valor); this.graficoGastos.append(fila);
    }
    if (!datos.length) this.graficoGastos.textContent = "No hay gastos en este mes.";
  }

  renderReporte(desde: string, reporteDesde: { ingresos: number; gastos: number; balance: number } | null, hasta: string, reporteHasta: { ingresos: number; gastos: number; balance: number } | null): void {
    this.comparacionMensual.replaceChildren();
    if (!desde || !hasta || !reporteDesde || !reporteHasta) { this.comparacionMensual.textContent = "Selecciona los dos meses y pulsa «Comparar meses» para ver los resultados."; return; }
    const nombreMes = (mes: string) => this.nombreMes(mes);
    const tabla = document.createElement("table"); tabla.className = "tabla-comparacion";
    const encabezado = document.createElement("tr");
    for (const texto of ["Concepto", nombreMes(desde), nombreMes(hasta), "Diferencia"]) { const celda = document.createElement("th"); celda.textContent = texto; encabezado.append(celda); }
    const thead = document.createElement("thead"); thead.append(encabezado);
    const tbody = document.createElement("tbody");
    for (const [concepto, llave] of [["Ingresos", "ingresos"], ["Gastos", "gastos"], ["Balance", "balance"]] as const) {
      const fila = document.createElement("tr");
      const valorDesde = reporteDesde[llave], valorHasta = reporteHasta[llave];
      for (const valor of [concepto, this.formatoDinero.format(valorDesde), this.formatoDinero.format(valorHasta), this.diferencia(valorHasta, valorDesde)]) { const celda = document.createElement("td"); celda.textContent = valor; fila.append(celda); }
      tbody.append(fila);
    }
    tabla.append(thead, tbody); this.comparacionMensual.append(tabla);
  }

  renderEtiquetaPeriodo(periodo: string, mes: string): void {
    this.periodoResumenEtiqueta.textContent = periodo === "todos" ? "Resumen general · Todos los meses" : `Resumen mensual · ${this.nombreMes(mes)}`;
  }

  private nombreMes(mes: string): string { return new Intl.DateTimeFormat("es-SV", { month: "long", year: "numeric" }).format(new Date(`${mes}-01T00:00:00`)); }

  prepararPdf(): void {
    const tituloPeriodo = this.periodoResumenEtiqueta.textContent || "Resumen";
    const lineas: Array<{ texto: string }> = [
      { texto: "CONTROL DE GASTOS - REPORTE" },
      { texto: tituloPeriodo },
      { texto: "" },
      { texto: "RESUMEN" },
      { texto: `Ingresos: ${this.totalIngresos.textContent ?? ""}` },
      { texto: `Gastos: ${this.totalGastos.textContent ?? ""}` },
      { texto: `Balance: ${this.balance.textContent ?? ""}` },
      { texto: "" },
      { texto: "GASTOS POR CATEGORIA" },
    ];
    const filasGrafico = [...this.graficoGastos.querySelectorAll<HTMLElement>(".barra-fila")];
    if (!filasGrafico.length) lineas.push({ texto: this.graficoGastos.textContent || "Sin gastos registrados." });
    for (const fila of filasGrafico) {
      const categoria = fila.querySelector("span")?.textContent ?? "Categoria";
      const monto = fila.querySelector("strong")?.textContent ?? "";
      lineas.push({ texto: `${categoria}: ${monto}` });
    }
    lineas.push({ texto: "" }, { texto: "PRESUPUESTOS" });
    const tarjetas = [...this.listaPresupuestos.querySelectorAll<HTMLElement>(".tarjeta-presupuesto")];
    if (!tarjetas.length) lineas.push({ texto: "Sin presupuestos para el periodo seleccionado." });
    for (const tarjeta of tarjetas) {
      const categoria = tarjeta.querySelector("strong")?.textContent ?? "";
      const detalle = tarjeta.querySelector(".presupuesto-detalle")?.textContent ?? "";
      const montos = detalle.match(/Presupuesto\s+(.+?)\s+·\s+Gastado\s+(.+?)\s+\(/);
      lineas.push({ texto: `${categoria}: presupuesto ${montos?.[1] ?? ""} · usado ${montos?.[2] ?? ""}` });
    }
    lineas.push({ texto: "" }, { texto: "COMPARACION DE MESES" });
    const tabla = this.comparacionMensual.querySelector("table");
    if (tabla) {
      for (const fila of [...tabla.querySelectorAll("tr")]) lineas.push({ texto: [...fila.querySelectorAll("th, td")].map((celda) => celda.textContent?.trim() ?? "").join(" | ") });
    } else lineas.push({ texto: "No hay comparacion confirmada." });
    this.descargarPdf(lineas, this.periodoResumen.value === "todos" ? "general" : this.mesResumen.value);
  }

  private descargarPdf(lineas: Array<{ texto: string }>, periodo: string): void {
    const porPagina = 48;
    const paginas = Array.from({ length: Math.ceil(lineas.length / porPagina) }, (_, pagina) => lineas.slice(pagina * porPagina, (pagina + 1) * porPagina));
    const objetos: string[] = [];
    const numeroFuente = 3 + paginas.length * 2;
    objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objetos[2] = `<< /Type /Pages /Kids [${paginas.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${paginas.length} >>`;
    paginas.forEach((pagina, indice) => {
      const paginaId = 3 + indice * 2;
      const contenidoId = paginaId + 1;
      let contenido = "BT /F1 10 Tf 48 790 Td 14 TL\n";
      for (const linea of pagina) {
        const texto = this.aAsciiPdf(linea.texto).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
        contenido += `(${texto}) Tj T*\n`;
      }
      contenido += "ET";
      objetos[paginaId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${numeroFuente} 0 R >> >> /Contents ${contenidoId} 0 R >>`;
      objetos[contenidoId] = `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`;
    });
    objetos[numeroFuente] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let id = 1; id < objetos.length; id++) { offsets[id] = pdf.length; pdf += `${id} 0 obj\n${objetos[id]}\nendobj\n`; }
    const inicioXref = pdf.length;
    pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objetos.length; id++) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte-${periodo}.pdf`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private aAsciiPdf(texto: string): string {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "-");
  }

  private diferencia(actual: number, anterior: number): string {
    const delta = actual - anterior;
    return `${delta >= 0 ? "+" : "−"}${this.formatoDinero.format(Math.abs(delta))}`;
  }

  private crearElementoMovimiento(movimiento: Movimiento): HTMLLIElement {
    const elemento = document.createElement("li");
    elemento.className = `movimiento movimiento-${movimiento.tipo}`;

    const informacion = document.createElement("div");
    informacion.className = "movimiento-informacion";

    const categoria = document.createElement("strong");
    categoria.textContent = movimiento.categoria;

    const detalle = document.createElement("span");
    detalle.textContent = `${movimiento.tipo === "ingreso" ? "Ingreso" : "Gasto"} · ${this.formatearFecha(movimiento.fecha)}${movimiento.descripcion ? ` · ${movimiento.descripcion}` : ""}`;

    const monto = document.createElement("strong");
    monto.className = "movimiento-monto";
    monto.textContent = `${movimiento.tipo === "gasto" ? "−" : "+"}${this.formatoDinero.format(movimiento.monto)}`;

    informacion.append(categoria, detalle);

    const acciones = document.createElement("div");
    acciones.className = "movimiento-acciones";
    acciones.append(
      this.crearBoton("Editar", "editar", movimiento.id),
      this.crearBoton("Eliminar", "eliminar", movimiento.id)
    );

    elemento.append(informacion, monto, acciones);
    return elemento;
  }

  private crearBoton(
    texto: string,
    accion: "editar" | "eliminar",
    id: string
  ): HTMLButtonElement {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = texto;
    boton.dataset.accion = accion;
    boton.dataset.id = id;
    boton.className = accion === "eliminar" ? "boton boton-peligro" : "boton boton-secundario";
    return boton;
  }

  prepararEdicion(movimiento: Movimiento): void {
    this.campoTipo.value = movimiento.tipo;
    this.actualizarOpcionesCategoria();
    this.campoMonto.value = String(movimiento.monto);
    const categoriaOption = [...this.campoCategoria.options].find((opcion) => opcion.textContent?.toLocaleLowerCase("es") === movimiento.categoria.toLocaleLowerCase("es"));
    if (categoriaOption) this.campoCategoria.value = categoriaOption.value;
    else { this.campoCategoria.value = "otro"; this.campoCategoriaOtro.value = movimiento.categoria; this.campoCategoriaOtro.hidden = false; }
    this.campoDescripcion.value = movimiento.descripcion;
    this.campoFecha.value = movimiento.fecha;
    if (this.botonGuardar) this.botonGuardar.textContent = "Guardar cambios";
    this.botonCancelar.hidden = false;
    this.formulario.scrollIntoView({ behavior: "smooth", block: "center" });
    this.campoMonto.focus();
  }

  limpiarFormulario(): void {
    this.formulario.reset();
    this.campoCategoriaOtro.value = ""; this.campoCategoriaOtro.hidden = true;
    this.campoDescripcion.value = "";
    this.actualizarOpcionesCategoria();
    this.campoFecha.value = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
    if (this.botonGuardar) this.botonGuardar.textContent = "Guardar movimiento";
    this.botonCancelar.hidden = true;
  }

  mostrarEstado(mensaje: string, esError = false): void {
    if (this.temporizadorMensaje !== undefined) window.clearTimeout(this.temporizadorMensaje);
    this.mensajeEstado.textContent = mensaje;
    this.mensajeEstado.classList.toggle("mensaje-error", esError);
    if (mensaje) {
      this.temporizadorMensaje = window.setTimeout(() => {
        this.mensajeEstado.textContent = "";
        this.mensajeEstado.classList.remove("mensaje-error");
        this.temporizadorMensaje = undefined;
      }, 4000);
    }
  }

  private formatearFecha(fecha: string): string {
    const fechaUtc = new Date(`${fecha}T00:00:00Z`);
    return new Intl.DateTimeFormat("es-SV", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(fechaUtc);
  }
}
