import express, { Request, Response } from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

// Tipos para anime y respuesta de MAL Integration
interface Anime {
  mal_id: number;
  title: string;
  score?: number;
  episodes?: number;
  synopsis?: string;
  [key: string]: unknown;
}

interface JikanResponse {
  data?: Anime[];
}

// Almacenamiento local en memoria
let animes: Anime[] = [];

// Endpoint para importar/sincronizar animes desde MAL Integration
app.post("/import", async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    res.status(400).json({ error: "Falta el parámetro de búsqueda 'q'" });
    return;
  }
  try {
    // Llama al microservicio de integración MAL
    const response = await fetch(`http://localhost:3004/search?q=${encodeURIComponent(q)}`);
    const data: JikanResponse = await response.json();
    if (Array.isArray(data.data)) {
      animes = data.data;
      res.json({ message: "Animes importados correctamente", count: animes.length });
      return;
    } else {
      res.status(500).json({ error: "Respuesta inesperada de MAL Integration" });
      return;
    }
  } catch {
    res.status(500).json({ error: "Error al importar animes desde MAL Integration" });
    return;
  }
});

// Endpoint para consultar los animes almacenados
app.get("/animes", (_req: Request, res: Response) => {
  res.json(animes);
});

app.listen(PORT, () => {
  console.log(`Servicio Catálogo escuchando en puerto ${PORT}`);
});
