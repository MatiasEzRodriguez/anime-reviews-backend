import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT || 3003;

app.get("/users", (req: Request, res: Response) => {
  res.json({ message: "Servicio de usuarios activo" });
});

app.listen(PORT, () => {
  console.log(`Servicio Usuarios escuchando en puerto ${PORT}`);
});
