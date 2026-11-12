import { MovimientoController } from "./controllers/MovimientoController";
import { StorageService } from "./services/StorageService";
import { MovimientoView } from "./views/MovimientoView";

const almacenamiento = new StorageService();
const vista = new MovimientoView();
new MovimientoController(vista, almacenamiento);
