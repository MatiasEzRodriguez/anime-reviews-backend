import app, { ensureUsersTable } from "./app.js";

const PORT = process.env.PORT || 3003;

(async () => {
  try {
    await ensureUsersTable();
    app.listen(PORT, () => {
      console.log(`Servicio Usuarios escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo inicializar el servicio de usuarios:", err);
    process.exit(1);
  }
})();
