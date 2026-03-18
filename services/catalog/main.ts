import app, { ensureAnimesTable } from "./app.js";

const PORT = process.env.PORT || 3001;

if (process.env.SERVICE === 'catalog') {
  (async () => {
    try {
      await ensureAnimesTable();
      app.listen(PORT, () => {
        console.log(`Servicio Catálogo escuchando en puerto ${PORT}`);
      });
    } catch (err) {
      console.error("No se pudo inicializar el servicio de catálogo:", err);
      process.exit(1);
    }
  })();
}

export default app;
