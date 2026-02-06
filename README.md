# node-typescript-boilerplate

[![Sponsor][sponsor-badge]][sponsor]
[![TypeScript version][ts-badge]][typescript-5-7]
[![Node.js version][nodejs-badge]][nodejs]
[![APLv2][license-badge]][license]
[![Build Status - GitHub Actions][gha-badge]][gha-ci]

👩🏻‍💻 Developer Ready: A comprehensive template. Works out of the box for most [Node.js][nodejs] projects.

🏃🏽 Instant Value: All basic tools included and configured:

- [TypeScript][typescript] [5.7][typescript-5-7]
- [ESM][esm]
- [ESLint][eslint] with some initial rules recommendation
- [Vitest][vitest] for fast unit testing and code coverage
- Type definitions for Node.js
- [Prettier][prettier] to enforce consistent code style
- NPM [scripts](#available-scripts) for common operations
- [EditorConfig][editorconfig] for consistent coding style
- Reproducible environments thanks to [Volta][volta]
- Example configuration for [GitHub Actions][gh-actions]
- Simple example of TypeScript code and unit test

🤲 Free as in speech: available under the APLv2 license.

## Getting Started

This project is intended to be used with the latest Active LTS release of [Node.js][nodejs].

### Use as a repository template

To start, just click the **[Use template][repo-template-action]** link (or the green button). Start adding your code in the `src` and unit tests in the `__tests__` directories.

### Clone repository

To clone the repository, use the following commands:

```sh
git clone https://github.com/jsynowiec/node-typescript-boilerplate
cd node-typescript-boilerplate
npm install
```

### Download latest release

Download and unzip the current **main** branch or one of the tags:

```sh
wget https://github.com/jsynowiec/node-typescript-boilerplate/archive/main.zip -O node-typescript-boilerplate.zip
unzip node-typescript-boilerplate.zip && rm node-typescript-boilerplate.zip
```

## Available Scripts

- `clean` - remove coverage data, cache and transpiled files,
- `prebuild` - lint source files and tests before building,
- `build` - transpile TypeScript to ES6,
- `build:watch` - interactive watch mode to automatically transpile source files,
- `lint` - lint source files and tests,
- `prettier` - reformat files,
- `test` - run tests,
- `test:watch` - interactive watch mode to automatically re-run tests
- `test:coverage` - run test and print out test coverage

## Additional Information

### Why include Volta

I recommend to [install][volta-getting-started] Volta and use it to manage your project's toolchain.

[Volta][volta]’s toolchain always keeps track of where you are, it makes sure the tools you use always respect the settings of the project you’re working on. This means you don’t have to worry about changing the state of your installed software when switching between projects. For example, it's [used by engineers at LinkedIn][volta-tomdale] to standardize tools and have reproducible development environments.

### Why Vitest instead of Jest

I recommend using [Vitest][vitest] for unit and integration testing of your TypeScript code.

In 2023, my team and I gradually switched from Jest to [Vitest][vitest] in all the projects. We've found out that generally, Vitest is faster than Jest, especially for large test suits. Furthermore, Vitest has native support for ES modules, is easier to configure, and has a much nicer developer experience when used with TypeScript. For example, when working with mocks, spies and types.

Nevertheless, the choice of specific tooling always depends on the specific requirements and characteristics of the project.

### ES Modules

This template uses native [ESM][esm]. Make sure to read [this][nodejs-esm], and [this][ts47-esm] first.

If your project requires CommonJS, you will have to [convert to ESM][sindresorhus-esm].

Please do not open issues for questions regarding CommonJS or ESM on this repo.

## Backers & Sponsors

Support this project by becoming a [sponsor][sponsor].

## License

Licensed under the APLv2. See the [LICENSE](https://github.com/jsynowiec/node-typescript-boilerplate/blob/main/LICENSE) file for details.

[ts-badge]: https://img.shields.io/badge/TypeScript-5.7-blue.svg
[nodejs-badge]: https://img.shields.io/badge/Node.js-22-blue.svg
[nodejs]: https://nodejs.org/dist/latest-v22.x/docs/api/
[gha-badge]: https://github.com/jsynowiec/node-typescript-boilerplate/actions/workflows/nodejs.yml/badge.svg
[gha-ci]: https://github.com/jsynowiec/node-typescript-boilerplate/actions/workflows/nodejs.yml
[typescript]: https://www.typescriptlang.org/
[typescript-5-7]: https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/
[license-badge]: https://img.shields.io/badge/license-APLv2-blue.svg
[license]: https://github.com/jsynowiec/node-typescript-boilerplate/blob/main/LICENSE
[sponsor-badge]: https://img.shields.io/badge/♥-Sponsor-fc0fb5.svg
[sponsor]: https://github.com/sponsors/jsynowiec
[eslint]: https://github.com/eslint/eslint
[prettier]: https://prettier.io
[volta]: https://volta.sh
[volta-getting-started]: https://docs.volta.sh/guide/getting-started
[volta-tomdale]: https://twitter.com/tomdale/status/1162017336699838467
[gh-actions]: https://github.com/features/actions
[repo-template-action]: https://github.com/jsynowiec/node-typescript-boilerplate/generate
[esm]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
[sindresorhus-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
[nodejs-esm]: https://nodejs.org/docs/latest-v16.x/api/esm.html
[ts47-esm]: https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs
[editorconfig]: https://editorconfig.org
[vitest]: https://vitest.dev

## Anime Reviews — Microservicios (este repositorio)

Este repositorio contiene un conjunto de microservicios en Node.js + TypeScript para un backend de reseñas de anime. Los servicios principales son:

- `gateway` (puerta de entrada, esqueleto)
- `services/mal-integration` (proxy a la API de Jikan / MyAnimeList)
- `services/catalog` (importa y persiste animes en Postgres)
- `services/users` (registro, login y JWT)
- `services/reviews` (CRUD de reseñas, relacionado con users y animes)

### Variables de entorno necesarias
Configurar estas variables antes de arrancar los servicios (puedes usar PowerShell, variables de sistema o un .env con tu gestor preferido):

- `DB_USER` - usuario de PostgreSQL (por defecto `postgres`)
- `DB_PASSWORD` - contraseña de PostgreSQL (por defecto `admin`)
- `DB_HOST` - host de la DB (por defecto `localhost`)
- `DB_NAME` - nombre de la BD (por defecto `anime_reviews`)
- `DB_PORT` - puerto de Postgres (por defecto `5432`)
- `JWT_SECRET` - secreto para firmar JWT (cambiar en producción)
- `PORT` - puerto para cada servicio (cada servicio puede usar su propia variable o el script npm asigna puertos por defecto)

Ejemplo PowerShell (temporal para la sesión):

```powershell
$env:DB_USER = 'postgres'; $env:DB_PASSWORD = 'admin'; $env:DB_HOST = 'localhost'; $env:DB_NAME = 'anime_reviews'; $env:DB_PORT = '5432'; $env:JWT_SECRET = 'cambiar_esto'
```

### Endpoints principales

Usuarios (`services/users` - puerto por defecto 3003)
- POST /register  { username, email, password } -> crea usuario
- POST /login     { username | email, password } -> devuelve { token }
- GET  /me        (header Authorization: Bearer <token>) -> devuelve { user }

Reviews (`services/reviews` - puerto por defecto 3002)
- POST   /reviews           (auth) { anime_id, rating, content } -> crea reseña
- GET    /reviews           -> lista reseñas (opcional query ?anime_id=123)
- GET    /reviews/:id       -> obtiene una reseña
- PUT    /reviews/:id       (auth, owner) { rating, content } -> actualiza
- DELETE /reviews/:id       (auth, owner) -> borra

Catalog (`services/catalog` - puerto por defecto 3001)
- POST /import?q=...  -> importa resultados desde MAL/Jikan y persiste en la tabla `animes`
- GET  /animes         -> lista animes guardados

MAL integration (`services/mal-integration` - puerto por defecto 3004)
- GET /search?q=...    -> proxy a `https://api.jikan.moe/v4/anime?q=...`

### SQL / Creación de tablas
Ejecutar en `anime_reviews` (pgAdmin o psql) los scripts provistos:

- `services/catalog/db.sql` — crea la tabla `animes` usada por el catálogo.
- `services/reviews/db.sql` — crea la tabla `reviews` usada por el servicio de reseñas.

Por ejemplo, en psql:

```sql
CREATE DATABASE anime_reviews;
-- Conectarse a anime_reviews y ejecutar:
\i services/catalog/db.sql;
\i services/reviews/db.sql;
```

Nota: los servicios `users` y `catalog` también crean sus tablas automáticamente si no existen (`CREATE TABLE IF NOT EXISTS`), por lo que puedes arrancarlos y dejar que hagan el bootstrap.

### Ejemplos rápidos (PowerShell)

Registrar usuario:
```powershell
Invoke-RestMethod -Uri 'http://localhost:3003/register' -Method POST -ContentType 'application/json' -Body (ConvertTo-Json @{username='ci_test'; email='test+ci@example.com'; password='pass123'})
```

Login (username o email):
```powershell
Invoke-RestMethod -Uri 'http://localhost:3003/login' -Method POST -ContentType 'application/json' -Body (ConvertTo-Json @{email='test+ci@example.com'; password='pass123'})
```

Obtener datos del usuario autenticado (usar token retornado):
```powershell
Invoke-RestMethod -Uri 'http://localhost:3003/me' -Method GET -Headers @{ Authorization = 'Bearer <AQUI_TU_TOKEN>' }
```

Crear una review (autenticado):
```powershell
Invoke-RestMethod -Uri 'http://localhost:3002/reviews' -Method POST -ContentType 'application/json' -Headers @{ Authorization = 'Bearer <AQUI_TU_TOKEN>' } -Body (ConvertTo-Json @{anime_id=123; rating=8; content='Me gustó mucho'})
```

### Scripts npm útiles
- `npm run build` - compila TypeScript
- `npm run start:gateway|start:catalog|start:reviews|start:users|start:mal` - arranca cada servicio (usa la salida compilada en `build/`)
- `npm test` - ejecuta la suite de tests (Vitest)

### Tests
Hay tests unitarios con Vitest en `__tests__/unit/`. Los tests actuales mockean las consultas a la base de datos para ser deterministas y rápidos. Ejecutar:

```powershell
npm test
```

### Consejos y siguientes pasos
- Cambiar `JWT_SECRET` antes de desplegar en producción.
- Considerar separar credenciales por servicio (si requieren diferentes DB/users).
- Añadir validaciones adicionales (p. ej. rating 1-10) y protección (rate limiting, CORS según gateway).

### Docker & Compose (despliegue local)

Se provee un `Dockerfile` genérico y `docker-compose.yml` para arranque local de la plataforma (incluye Postgres). El Dockerfile compila el proyecto y arranca el servicio indicado por la variable de entorno `SERVICE`.

Ejemplo (PowerShell) — arrancar Postgres + usuarios + reviews:

```powershell
$env:DB_USER='postgres'; $env:DB_PASSWORD='admin'; $env:DB_NAME='anime_reviews'; $env:DB_PORT='5432'; $env:JWT_SECRET='cambiar_esto'
docker compose up --build users reviews postgres
```

Para levantar todos los servicios:

```powershell
docker compose up --build
```

Logs útiles:

```powershell
docker compose logs -f users
```

Si preferís ejecutar servicios individualmente con Dockerfile, exportá `SERVICE` y ejecutá la imagen:

```powershell
docker build -t anime-reviews .
docker run -e SERVICE=users -e DB_HOST=host.docker.internal -e DB_USER=postgres -e DB_PASSWORD=admin -p 3003:3003 anime-reviews
```

### CI (GitHub Actions)

Se añadió un workflow de CI en `.github/workflows/ci.yml` que ejecuta lint, build y tests en cada push/pull request hacia `main`.


