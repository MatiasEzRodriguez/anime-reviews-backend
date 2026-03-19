import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET ?? "change_this_secret";

export async function ensureUsersTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(sql);
}

// Registro
app.post("/register", async (req: Request, res: Response) => {
  const { username, email, password } = req.body as { username?: string; email?: string; password?: string };
  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email y password son requeridos" });
    return;
  }
  try {
    const exists = await pool.query("SELECT id FROM users WHERE username = $1 OR email = $2", [username, email]);
    if (exists.rowCount > 0) {
      res.status(409).json({ error: "Usuario o email ya existe" });
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, hash],
    );
    const user = insert.rows[0];
    res.status(201).json({ user });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Login: acepta `username` o `email`
app.post("/login", async (req: Request, res: Response) => {
  const { username, email, password } = req.body as { username?: string; email?: string; password?: string };
  if ((!username && !email) || !password) {
    res.status(400).json({ error: "username/email y password son requeridos" });
    return;
  }
  try {
    const query = email ? "SELECT id, username, password_hash FROM users WHERE email = $1" : "SELECT id, username, password_hash FROM users WHERE username = $1";
    const identifier = (email ?? username) as string;
    const result = await pool.query(query, [identifier]);
    if (result.rowCount === 0) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error en login" });
  }
});

export interface AuthRequest extends Request {
  userId?: number;
}

// Middleware de auth
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  const token = auth.split(" ")[1];
  // Caso donde el token está vacío o solo contiene espacios (ej: después de logout)
  if (!token) {
    res.status(401).json({ error: "Token no proporcionado" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; username?: string };
    req.userId = payload.userId;
    next();
  } catch (err) {
    console.error("Auth verify error:", err);
    res.status(401).json({ error: "Token inválido" });
  }
}

// Endpoint protegido /me
app.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  try {
    const result = await pool.query("SELECT id, username, email, created_at FROM users WHERE id = $1", [userId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("/me error:", err);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

export default app;
