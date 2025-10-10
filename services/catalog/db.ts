import { Pool } from "pg";

export const pool = new Pool({
  user: "postgres", // Cambia por tu usuario
  host: "localhost",
  database: "anime_reviews",
  password: "postgres", // Cambia por tu contraseña
  port: 5432,
});
