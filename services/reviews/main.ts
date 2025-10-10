import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT || 3002;

app.get("/reviews", (req: Request, res: Response) => {
  res.json({ message: "Servicio de opiniones activo" });
});

app.listen(PORT, () => {
  console.log(`Servicio Opiniones escuchando en puerto ${PORT}`);
});
