import express, { Request, Response } from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req: Request, res: Response) => {
  res.send("API Gateway de Anime Reviews activo");
});

app.listen(PORT, () => {
  console.log(`Gateway escuchando en puerto ${PORT}`);
});
