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
  import_date?: string;
  [key: string]: unknown;
}

interface JikanResponse {
  data?: Anime[];
}

interface RankingResponse {
  data: Anime[];
  metadata: {
    count: number;
    limit: number;
  };
}

// Función helper para validar y parsear el query param limit
function parseLimit(param: unknown, defaultValue: number, maxValue: number): number {
  const parsed = Number(param);
  if (Number.isNaN(parsed) || parsed < 1) {
    return defaultValue;
  }
  return Math.min(parsed, maxValue);
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
      image_url VARCHAR(500),
      import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(create);

  // Agregar columna image_url si no existe (para tablas existentes)
  await pool.query(`
    ALTER TABLE animes ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
  `);
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
      // Extraer image_url de la respuesta de Jikan
      const imageUrl = it.images?.jpg?.image_url ?? it.image_url ?? null;

      if (!malId || !title) return null;

      const sql = `
        INSERT INTO animes (mal_id, title, score, episodes, synopsis, image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (mal_id) DO UPDATE SET
          title = EXCLUDED.title,
          score = EXCLUDED.score,
          episodes = EXCLUDED.episodes,
          synopsis = EXCLUDED.synopsis,
          image_url = EXCLUDED.image_url,
          import_date = CURRENT_TIMESTAMP
        RETURNING *;
      `;
      const values = [malId, title, score, episodes, synopsis, imageUrl];
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
    const result = await pool.query(`SELECT id, mal_id, title, score, episodes, synopsis, image_url, import_date FROM animes ORDER BY import_date DESC LIMIT 200`);
    res.json(result.rows);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Error al consultar animes" });
  }
});

// GET /animes/:id - Obtener un anime por su ID interno
app.get("/animes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const animeId = Number(id);

  if (Number.isNaN(animeId)) {
    res.status(400).json({ error: "ID de anime inválido" });
    return;
  }

  try {
    const query = `
      SELECT 
        a.id, 
        a.mal_id, 
        a.title, 
        a.image_url,
        a.score,
        a.episodes,
        a.synopsis,
        ROUND(AVG(r.rating), 2) AS platform_rating,
        COUNT(r.id)::int AS review_count
      FROM animes a
      LEFT JOIN reviews r ON r.anime_id = a.id
      WHERE a.id = $1
      GROUP BY a.id, a.mal_id, a.title, a.image_url, a.score, a.episodes, a.synopsis
    `;
    const result = await pool.query(query, [animeId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Anime no encontrado" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Error al consultar anime" });
  }
});

// GET /animes/by-mal/:malId - Buscar anime por su mal_id de MyAnimeList
app.get("/animes/by-mal/:malId", async (req: Request, res: Response) => {
  const { malId } = req.params;
  const malIdNum = Number(malId);

  if (Number.isNaN(malIdNum)) {
    res.status(400).json({ error: "MAL ID inválido" });
    return;
  }

  try {
    const query = `
      SELECT 
        a.id, 
        a.mal_id, 
        a.title, 
        a.image_url,
        a.score,
        a.episodes,
        a.synopsis,
        ROUND(AVG(r.rating), 2) AS platform_rating,
        COUNT(r.id)::int AS review_count
      FROM animes a
      LEFT JOIN reviews r ON r.anime_id = a.id
      WHERE a.mal_id = $1
      GROUP BY a.id, a.mal_id, a.title, a.image_url, a.score, a.episodes, a.synopsis
    `;
    const result = await pool.query(query, [malIdNum]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Anime no encontrado" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Error al consultar anime por MAL ID" });
  }
});

// GET /ranking/top - Top animes por puntuación
app.get("/ranking/top", async (req: Request, res: Response) => {
  const limit = parseLimit(req.query.limit, 10, 50);

  try {
    const query = `
      SELECT id, mal_id, title, score, episodes, synopsis, image_url, import_date
      FROM animes
      WHERE score IS NOT NULL
      ORDER BY score DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);

    const response: RankingResponse = {
      data: result.rows,
      metadata: {
        count: result.rows.length,
        limit,
      },
    };

    res.json(response);
  } catch (err) {
    console.error("Ranking top error:", err);
    res.status(500).json({ error: "Error al obtener ranking de puntuación" });
  }
});

// GET /ranking/episodes - Animes con más episodios
app.get("/ranking/episodes", async (req: Request, res: Response) => {
  const limit = parseLimit(req.query.limit, 10, 50);

  try {
    const query = `
      SELECT id, mal_id, title, score, episodes, synopsis, image_url, import_date
      FROM animes
      WHERE episodes > 0
      ORDER BY episodes DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);

    const response: RankingResponse = {
      data: result.rows,
      metadata: {
        count: result.rows.length,
        limit,
      },
    };

    res.json(response);
  } catch (err) {
    console.error("Ranking episodes error:", err);
    res.status(500).json({ error: "Error al obtener ranking de episodios" });
  }
});

// GET /ranking/recent - Animes recientemente importados
app.get("/ranking/recent", async (req: Request, res: Response) => {
  const limit = parseLimit(req.query.limit, 10, 50);

  try {
    const query = `
      SELECT id, mal_id, title, score, episodes, synopsis, image_url, import_date
      FROM animes
      ORDER BY import_date DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);

    const response: RankingResponse = {
      data: result.rows,
      metadata: {
        count: result.rows.length,
        limit,
      },
    };

    res.json(response);
  } catch (err) {
    console.error("Ranking recent error:", err);
    res.status(500).json({ error: "Error al obtener ranking reciente" });
  }
});

// GET /animes/top-rating - Animes ordenados por promedio de rating de sus reviews
app.get("/animes/top-rating", async (req: Request, res: Response) => {
  const limit = parseLimit(req.query.limit, 10, 50);

  try {
    const query = `
      SELECT 
        a.id, 
        a.mal_id, 
        a.title, 
        a.image_url,
        ROUND(AVG(r.rating), 2) AS platform_rating,
        COUNT(r.id)::int AS count
      FROM animes a
      INNER JOIN reviews r ON r.anime_id = a.id
      WHERE r.rating IS NOT NULL
      GROUP BY a.id, a.mal_id, a.title, a.image_url
      HAVING COUNT(r.id) >= 1
      ORDER BY platform_rating DESC, count DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);

    res.json({
      data: result.rows,
      metadata: {
        count: result.rows.length,
        limit,
      },
    });
  } catch (err) {
    console.error("Top rating error:", err);
    res.status(500).json({ error: "Error al obtener ranking de rating" });
  }
});

// GET /animes/top-reviewed - Animes ordenados por cantidad de reviews
app.get("/animes/top-reviewed", async (req: Request, res: Response) => {
  const limit = parseLimit(req.query.limit, 10, 50);

  try {
    const query = `
      SELECT 
        a.id, 
        a.mal_id, 
        a.title, 
        a.image_url,
        COUNT(r.id)::int AS review_count
      FROM animes a
      INNER JOIN reviews r ON r.anime_id = a.id
      GROUP BY a.id, a.mal_id, a.title, a.image_url
      HAVING COUNT(r.id) >= 1
      ORDER BY review_count DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);

    res.json({
      data: result.rows,
      metadata: {
        count: result.rows.length,
        limit,
      },
    });
  } catch (err) {
    console.error("Top reviewed error:", err);
    res.status(500).json({ error: "Error al obtener ranking de reviews" });
  }
});

// GET /animes/recent-reviewed - Animes ordenados por la review más reciente
app.get("/animes/recent-reviewed", async (req: Request, res: Response) => {
  const limit = parseLimit(req.query.limit, 10, 50);

  try {
    const query = `
      SELECT 
        a.id, 
        a.mal_id, 
        a.title, 
        a.image_url,
        MAX(r.created_at) AS last_review_date
      FROM animes a
      INNER JOIN reviews r ON r.anime_id = a.id
      GROUP BY a.id, a.mal_id, a.title, a.image_url
      HAVING COUNT(r.id) >= 1
      ORDER BY last_review_date DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);

    res.json({
      data: result.rows,
      metadata: {
        count: result.rows.length,
        limit,
      },
    });
  } catch (err) {
    console.error("Recent reviewed error:", err);
    res.status(500).json({ error: "Error al obtener animes con reviews recientes" });
  }
});

// Inicializar esquema y arrancar solo si se ejecuta directamente o está configurado para ello
(async () => {
  try {
    await ensureSchema();
    if (process.env.SERVICE === 'catalog' || require.main === module) {
      app.listen(PORT, () => {
        console.log(`Servicio Catálogo escuchando en puerto ${PORT}`);
      });
    }
  } catch (err) {
    console.error("No se pudo inicializar el servicio de catálogo:", err);
    process.exit(1);
  }
})();

export default app;
