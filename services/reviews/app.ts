import express, { Request, Response, NextFunction } from "express";
import { pool } from "./db.js";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET ?? "change_this_secret";

export async function ensureReviewsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      anime_id INTEGER NOT NULL,
      rating INTEGER,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(sql);
}

interface AuthRequest extends Request {
  userId?: number;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" });
  }
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = payload.userId;
    return next();
  } catch (err) {
    console.error("Auth verify error (reviews):", err);
    return res.status(401).json({ error: "Token inválido" });
  }
}

// Create review
app.post("/reviews", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number | undefined;
  const { anime_id, rating, content } = req.body as { anime_id?: number; rating?: number; content?: string };
  if (!userId) return res.status(401).json({ error: "No autorizado" });
  if (!anime_id) return res.status(400).json({ error: "anime_id requerido" });
  // Validaciones: rating (si está presente) entre 1 y 10, content longitud máxima
  if (rating !== undefined && rating !== null) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 10) {
      return res.status(400).json({ error: "rating debe ser un entero entre 1 y 10" });
    }
  }
  if (content && content.length > 2000) {
    return res.status(400).json({ error: "content demasiado largo (max 2000 caracteres)" });
  }
  try {
    const insert = await pool.query(
      `INSERT INTO reviews (user_id, anime_id, rating, content) VALUES ($1,$2,$3,$4) RETURNING *`,
      [userId, anime_id, rating ?? null, content ?? null],
    );
    return res.status(201).json({ review: insert.rows[0] });
  } catch (err) {
    console.error("Create review error:", err);
    return res.status(500).json({ error: "Error al crear review" });
  }
});

// List reviews (optionally filter by anime_id)
app.get("/reviews", async (req: Request, res: Response) => {
  const animeId = req.query.anime_id as string | undefined;
  try {
    if (animeId) {
      const q = await pool.query(
        `SELECT r.*, u.username FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.anime_id = $1 ORDER BY r.created_at DESC`,
        [Number(animeId)],
      );
      return res.json({ reviews: q.rows });
    }
    const q = await pool.query(`SELECT r.*, u.username FROM reviews r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC`);
    return res.json({ reviews: q.rows });
  } catch (err) {
    console.error("List reviews error:", err);
    return res.status(500).json({ error: "Error al listar reviews" });
  }
});

// Get single review
app.get("/reviews/:id", async (req: Request, res: Response) => {
  try {
    const q = await pool.query(`SELECT r.*, u.username FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.id = $1`, [Number(req.params.id)]);
    if (q.rowCount === 0) return res.status(404).json({ error: "Review no encontrada" });
    return res.json({ review: q.rows[0] });
  } catch (err) {
    console.error("Get review error:", err);
    return res.status(500).json({ error: "Error al obtener review" });
  }
});

// Update review (owner only)
app.put("/reviews/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number | undefined;
  const { rating, content } = req.body as { rating?: number; content?: string };
  try {
    const q = await pool.query(`SELECT * FROM reviews WHERE id = $1`, [Number(req.params.id)]);
    if (q.rowCount === 0) return res.status(404).json({ error: "Review no encontrada" });
    const review = q.rows[0];
    if (review.user_id !== userId) return res.status(403).json({ error: "No permitido" });
    // Validaciones: rating (si está presente) entre 1 y 10, content longitud máxima
    if (rating !== undefined && rating !== null) {
      const r = Number(rating);
      if (!Number.isInteger(r) || r < 1 || r > 10) {
        return res.status(400).json({ error: "rating debe ser un entero entre 1 y 10" });
      }
    }
    if (content && content.length > 2000) {
      return res.status(400).json({ error: "content demasiado largo (max 2000 caracteres)" });
    }
    const upd = await pool.query(`UPDATE reviews SET rating = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`, [rating ?? review.rating, content ?? review.content, Number(req.params.id)]);
    return res.json({ review: upd.rows[0] });
  } catch (err) {
    console.error("Update review error:", err);
    return res.status(500).json({ error: "Error al actualizar review" });
  }
});

// Delete review (owner only)
app.delete("/reviews/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number | undefined;
  try {
    const q = await pool.query(`SELECT * FROM reviews WHERE id = $1`, [Number(req.params.id)]);
    if (q.rowCount === 0) return res.status(404).json({ error: "Review no encontrada" });
    const review = q.rows[0];
    if (review.user_id !== userId) return res.status(403).json({ error: "No permitido" });
    await pool.query(`DELETE FROM reviews WHERE id = $1`, [Number(req.params.id)]);
    return res.status(204).end();
  } catch (err) {
    console.error("Delete review error:", err);
    return res.status(500).json({ error: "Error al eliminar review" });
  }
});

export default app;
