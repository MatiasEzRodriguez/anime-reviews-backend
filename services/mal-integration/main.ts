import express, { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3004;

// ============================================
// Cache Manager - Sistema de caché en memoria
// ============================================

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry>;
  private ttl: number;

  constructor(ttlMs: number = 600000) { // 10 minutos por defecto
    this.cache = new Map<string, CacheEntry>();
    this.ttl = ttlMs;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const isExpired = Date.now() - entry.timestamp > this.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Instancia del cache con TTL de 10 minutos (600000 ms)
const animeCache = new CacheManager(600000);

// ============================================
// Endpoints
// ============================================

// Endpoint de prueba
app.get("/mal", (_req: Request, res: Response) => {
  res.json({ message: "Integración MyAnimeList activa" });
});

// Endpoint para buscar animes por nombre usando la API pública de Jikan (proxy de MAL)
app.get("/search", async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    next(error);
    return;
  }
});

// Endpoint para obtener detalles de un anime por su ID de MyAnimeList
app.get("/anime/:malId", async (req: Request, res: Response, next: NextFunction) => {
  const { malId } = req.params;

  // Validar que malId sea un número válido
  const animeId = Number(malId);
  if (isNaN(animeId) || animeId <= 0) {
    res.status(400).json({ error: "ID de MyAnimeList inválido" });
    return;
  }

  const cacheKey = `anime:${malId}`;

  // Verificar si existe en caché
  if (animeCache.has(cacheKey)) {
    const cachedData = animeCache.get(cacheKey);
    res.json(cachedData);
    return;
  }

  try {
    // Llamar a Jikan API para obtener los datos del anime
    const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}`);

    if (response.status === 404) {
      res.status(404).json({ error: "Anime no encontrado en MyAnimeList" });
      return;
    }

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`);
    }

    const data = await response.json();

    // Guardar en caché antes de retornar
    animeCache.set(cacheKey, data);

    res.json(data);
    return;
  } catch (error) {
    next(error);
    return;
  }
});

// Middleware de errores
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error en MAL Integration:", err);
  res.status(500).json({ error: "Error al consultar MyAnimeList" });
});

// Solo iniciar el servidor si se ejecuta directamente o está configurado para ello
if (process.env.SERVICE === 'mal' || import.meta.main) {
  app.listen(PORT, () => {
    console.log(`Servicio MAL Integration escuchando en puerto ${PORT}`);
  });
}

export default app;
