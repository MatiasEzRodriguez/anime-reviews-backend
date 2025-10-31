import express, { Request, Response } from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3004;

// Endpoint de prueba
app.get("/mal", (_req: Request, res: Response) => {
  res.json({ message: "Integración MyAnimeList activa" });
});

// Endpoint para buscar animes por nombre usando la API pública de Jikan (proxy de MAL)
app.get("/search", async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    res.status(400).json({ error: "Falta el parámetro de búsqueda 'q'" });
    return;
  }
  try {
    // Usamos Jikan API como proxy público de MAL
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=5`);
  const data = await response.json();
  res.json(data);
  return;
  } catch {
    res.status(500).json({ error: "Error al consultar MyAnimeList" });
    return;
  }
});

app.listen(PORT, () => {
  console.log(`Servicio MAL Integration escuchando en puerto ${PORT}`);
});
