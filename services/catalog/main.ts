import express, { Request, Response } from "express";
import fetch from "node-fetch";
import { pool } from "./db.js";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

// Tipos para anime y respuesta de MAL Integration
interface Anime {
  mal_id: number;
  title: string;
  score?: number | null;
  episodes?: number | null;
  synopsis?: string | null;
  [key: string]: unknown;
}

interface JikanResponse {
  data?: Anime[];
}

// Inicializar esquema (crea tabla si no existe)
async function ensureSchema(): Promise<void> {
  const create = `
    CREATE TABLE IF NOT EXISTS animes (
      id SERIAL PRIMARY KEY,
      mal_id INT UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      score DOUBLE PRECISION,
      episodes INT,
      synopsis TEXT,
      import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(create);
}

// Endpoint para importar/sincronizar animes desde MAL Integration y persistir en PostgreSQL
app.post("/import", async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    res.status(400).json({ error: "Falta el parámetro de búsqueda 'q'" });
    return;
  }

  try {
    const response = await fetch(`http://localhost:3004/search?q=${encodeURIComponent(q)}`);
    const data: JikanResponse = await response.json();
    const items = Array.isArray(data.data) ? data.data : [];

    // Upsert cada anime
    const upsertPromises = items.map(async (it) => {
      const malId = it.mal_id ?? it.malId ?? it.mal_id;
      const title = it.title ?? it.name ?? "";
      const score = typeof it.score === "number" ? it.score : null;
      const episodes = typeof it.episodes === "number" ? it.episodes : null;
      const synopsis = typeof it.synopsis === "string" ? it.synopsis : null;

      if (!malId || !title) return null;

      const sql = `
        INSERT INTO animes (mal_id, title, score, episodes, synopsis)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (mal_id) DO UPDATE SET
          title = EXCLUDED.title,
          score = EXCLUDED.score,
          episodes = EXCLUDED.episodes,
          synopsis = EXCLUDED.synopsis,
          import_date = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const values = [malId, title, score, episodes, synopsis];
      const result = await pool.query(sql, values);
      return result.rows[0];
    });

    const rows = (await Promise.all(upsertPromises)).filter(Boolean);
    res.json({ message: "Animes importados y persistidos", count: rows.length });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ error: "Error al importar animes desde MAL Integration" });
  }
});

// Endpoint para consultar los animes almacenados en DB
app.get("/animes", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT id, mal_id, title, score, episodes, synopsis, import_date FROM animes ORDER BY import_date DESC LIMIT 200`);
    res.json(result.rows);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Error al consultar animes" });
  }
});

// Inicializar esquema y arrancar
(async () => {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`Servicio Catálogo escuchando en puerto ${PORT}`);
    });
  } catch (err) {
    console.error("No se pudo inicializar el servicio de catálogo:", err);
    process.exit(1);
  }
})();
