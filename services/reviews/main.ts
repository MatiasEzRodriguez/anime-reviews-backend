import app, { ensureReviewsTable } from "./app.js";

const PORT = process.env.PORT || 3002;

(async () => {
  try {
    await ensureReviewsTable();
    app.listen(PORT, () => {
      console.log(`Servicio Opiniones escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo inicializar el servicio de opiniones:", err);
    process.exit(1);
  }
})();

export default app;
