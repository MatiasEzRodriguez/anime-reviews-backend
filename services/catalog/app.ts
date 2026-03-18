import express, { Request, Response } from "express";
import { pool } from "./db.js";

const app = express();
app.use(express.json());

export async function ensureAnimesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS animes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      genre VARCHAR(100),
      episodes INTEGER,
      year INTEGER,
      rating DECIMAL(3,1),
      synopsis TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(sql);
}

// Import anime data from MyAnimeList
app.post("/import", async (_req: Request, res: Response) => {
  // Placeholder - implementar integración con MAL si es necesario
  res.status(501).json({ error: "Import not implemented yet" });
});

// List all animes (with optional filters)
app.get("/animes", async (req: Request, res: Response) => {
  const { genre, year } = req.query;
  try {
    let query = "SELECT * FROM animes WHERE 1=1";
    const params: (string | number)[] = [];
    let idx = 1;

    if (genre) {
      query += ` AND genre ILIKE $${idx}`;
      params.push(`%${genre}%`);
      idx++;
    }
    if (year) {
      query += ` AND year = $${idx}`;
      params.push(Number(year));
      idx++;
    }

    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, params);
    return res.json({ animes: result.rows });
  } catch (err) {
    console.error("List animes error:", err);
    return res.status(500).json({ error: "Error al listar animes" });
  }
});

// Top rated animes (RUTA ESTÁTICA - va antes de :id)
app.get("/animes/top-rating", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM animes WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 20"
    );
    return res.json({ animes: result.rows });
  } catch (err) {
    console.error("Top rating error:", err);
    return res.status(500).json({ error: "Error al obtener top rating" });
  }
});

// Top reviewed animes (RUTA ESTÁTICA - va antes de :id)
app.get("/animes/top-reviewed", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT a.*, COUNT(r.id) as review_count
      FROM animes a
      LEFT JOIN reviews r ON r.anime_id = a.id
      GROUP BY a.id
      ORDER BY review_count DESC
      LIMIT 20
    `);
    return res.json({ animes: result.rows });
  } catch (err) {
    console.error("Top reviewed error:", err);
    return res.status(500).json({ error: "Error al obtener top reviewed" });
  }
});

// Recently reviewed animes (RUTA ESTÁTICA - va antes de :id)
app.get("/animes/recent-reviewed", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT a.*
      FROM animes a
      JOIN reviews r ON r.anime_id = a.id
      ORDER BY r.created_at DESC
      LIMIT 20
    `);
    return res.json({ animes: result.rows });
  } catch (err) {
    console.error("Recent reviewed error:", err);
    return res.status(500).json({ error: "Error al obtener recent reviewed" });
  }
});

// Get single anime by ID (RUTA DINÁMICA - va DESPUÉS de las estáticas)
app.get("/animes/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM animes WHERE id = $1", [Number(req.params.id)]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Anime no encontrado" });
    }
    return res.json({ anime: result.rows[0] });
  } catch (err) {
    console.error("Get anime error:", err);
    return res.status(500).json({ error: "Error al obtener anime" });
  }
});

export default app;
