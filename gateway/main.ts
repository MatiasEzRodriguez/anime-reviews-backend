import express, { Request, Response, NextFunction } from "express";
import proxy from "express-http-proxy";

const app = express();
const PORT = process.env.PORT || 3000;

// URLs de los microservicios (configurables mediante variables de entorno)
const SERVICES = {
  catalog: process.env.CATALOG_SERVICE_URL || "http://localhost:3001",
  reviews: process.env.REVIEWS_SERVICE_URL || "http://localhost:3002",
  users: process.env.USERS_SERVICE_URL || "http://localhost:3003",
  mal: process.env.MAL_SERVICE_URL || "http://localhost:3004",
} as const;

// Helper para generar las opciones del proxy
const proxyOptions = (serviceUrl: string, serviceName: string) => ({
  proxyReqPathResolver: (req: Request): string => {
    // Remueve /api/service-name del path y reenía al servicio destino
    const pathMatch = req.url.match(/^\/api\/[^/]+(.*)$/);
    const newPath = pathMatch ? pathMatch[1] || "/" : req.url;
    return `${serviceUrl}${newPath}`;
  },
  proxyErrorHandler: (err: Error, _res: Response, next: NextFunction): void => {
    console.error(`[Gateway] Error al conectar con ${serviceName}: ${err.message}`);
    next(err);
  },
  onProxyReq: (proxyReq: ReturnType<typeof proxy>, req: Request): void => {
    console.log(`[Gateway] Reenviando ${req.method} ${req.url} -> ${serviceName}`);
    // Preservar headers importantes
    if (req.headers.authorization) {
      proxyReq.setHeader("Authorization", req.headers.authorization);
    }
  },
});

// Middleware para logging de requests
app.use((req: Request, _res: Response, next: NextFunction): void => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Endpoint raíz
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "API Gateway de Anime Reviews activo" });
});

// Endpoint de health check - verifica estado de todos los servicios
app.get("/health", async (_req: Request, res: Response) => {
  const healthStatus: Record<string, { status: string; url: string }> = {};
  
  const checkService = async (
    name: keyof typeof SERVICES,
    url: string
  ): Promise<void> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      healthStatus[name] = {
        status: response.ok ? "healthy" : "unhealthy",
        url,
      };
    } catch {
      healthStatus[name] = {
        status: "unreachable",
        url,
      };
    }
  };

  // Verificar cada servicio
  await Promise.all(
    Object.entries(SERVICES).map(([name, url]) =>
      checkService(name as keyof typeof SERVICES, url)
    )
  );

  const allHealthy = Object.values(healthStatus).every(
    (s) => s.status === "healthy"
  );

  res.status(allHealthy ? 200 : 503).json({
    gateway: "healthy",
    services: healthStatus,
  });
});

// Rutas hacia Catalog Service (puerto 3001)
// /api/catalog/* -> http://localhost:3001/*
app.use("/api/catalog", proxy(SERVICES.catalog, proxyOptions(SERVICES.catalog, "Catalog")));

// Rutas hacia Reviews Service (puerto 3002)
// /api/reviews/* -> http://localhost:3002/*
app.use("/api/reviews", proxy(SERVICES.reviews, proxyOptions(SERVICES.reviews, "Reviews")));

// Rutas hacia Users Service (puerto 3003)
// /api/users/* -> http://localhost:3003/*
app.use("/api/users", proxy(SERVICES.users, proxyOptions(SERVICES.users, "Users")));

// Rutas hacia MAL Integration Service (puerto 3004)
// /api/mal/* -> http://localhost:3004/*
app.use("/api/mal", proxy(SERVICES.mal, proxyOptions(SERVICES.mal, "MAL Integration")));

// Middleware para manejar rutas no encontradas
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: "La ruta solicitada no existe",
  });
});

// Middleware centralizado de errores - retorna 502 si el servicio no está disponible
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  const errorMessage = err.message.toLowerCase();
  
  // Detectar errores de conexión con el servicio
  if (errorMessage.includes("econnrefused") || errorMessage.includes("connect")) {
    res.status(502).json({
      error: "Bad Gateway",
      message: "El servicio destino no está disponible",
    });
    return;
  }
  
  console.error(`[Gateway] Error interno: ${err.message}`);
  res.status(500).json({
    error: "Internal Server Error",
    message: "Error interno del gateway",
  });
});

app.listen(PORT, () => {
  console.log(`Gateway escuchando en puerto ${PORT}`);
  console.log(`Servicios configurados:`);
  console.log(`  - Catalog: ${SERVICES.catalog}`);
  console.log(`  - Reviews: ${SERVICES.reviews}`);
  console.log(`  - Users: ${SERVICES.users}`);
  console.log(`  - MAL Integration: ${SERVICES.mal}`);
});
