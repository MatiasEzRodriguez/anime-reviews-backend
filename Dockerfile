FROM node:22-alpine

# Trabajo en /app
WORKDIR /app

# Copiar package.json primero para aprovechar cache de layers
COPY package.json package-lock.json* ./

# Instalar dependencias (incluye dev para compilar TS)
RUN npm ci --silent || npm install --silent

# Copiar el resto del proyecto
COPY . .

# Construir TypeScript
RUN npm run build

# Entrypoint que arranca el servicio indicado en la variable SERVICE
COPY ./entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production

ENTRYPOINT ["/app/entrypoint.sh"]
