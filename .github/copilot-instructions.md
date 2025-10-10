# Copilot Instructions for anime-reviews-backend

## Arquitectura y Estructura General
- Proyecto Node.js + TypeScript, orientado a ESM (ECMAScript Modules).
- Código fuente en `src/`, pruebas unitarias en `__tests__/unit/`.
- La salida de compilación va a `build/`.
- Usa Volta para fijar versiones de Node y herramientas.
- El archivo principal es `src/main.ts`.

## Flujos de Desarrollo
- Compila con: `npm run build` (genera `build/src/main.js`).
- Ejecuta la app: `npm start` (corre el build generado).
- Pruebas unitarias: `npm test` (usa Vitest, configuración en `__tests__/vitest.config.ts`).
- Linting: `npm run lint`.
- Formato: `npm run prettier`.
- Limpieza: `npm run clean` (borra build, cobertura y temporales).

## Convenciones y Patrones
- Usa ESM nativo (`type: module` en `package.json`).
- Los scripts npm están predefinidos para flujos comunes.
- Los delays y utilidades están centralizados en enums y funciones en `src/main.ts`.
- Los tipos de Node y librerías externas se gestionan vía `@types/*` en devDependencies.
- El proyecto no usa CommonJS ni require, solo `import/export`.

## Integraciones y Dependencias
- ESLint y Prettier para calidad y formato de código.
- Vitest para testing (más rápido y moderno que Jest, soporte ESM).
- Volta para entornos reproducibles.
- No hay frameworks web ni bases de datos integrados por defecto.

## Ejemplo de flujo típico
```sh
npm install
npm run build
npm start
npm test
```

## Archivos clave
- `src/main.ts`: punto de entrada y ejemplo de función asíncrona.
- `__tests__/unit/main.test.ts`: ejemplo de test unitario.
- `tsconfig.json`: configuración de compilador TypeScript.
- `package.json`: scripts, dependencias y configuración ESM.

## Notas
- Si agregas dependencias, instala también los tipos (`@types/paquete`) si están disponibles.
- Si cambias la estructura de carpetas, actualiza `tsconfig.json` y los scripts npm.
- Para problemas con scripts en PowerShell, usa `cmd` como alternativa.
