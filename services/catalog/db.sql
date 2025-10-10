-- Script para crear la base de datos y tablas iniciales

-- 1. Crear la base de datos
CREATE DATABASE anime_reviews;

-- 2. Conectarse a la base de datos
-- \c anime_reviews

-- 3. Crear tabla de animes
CREATE TABLE animes (
    id SERIAL PRIMARY KEY,
    mal_id INT UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    score FLOAT,
    episodes INT,
    synopsis TEXT,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- (Opcional) Crear tablas de usuarios y reviews para el futuro
-- CREATE TABLE users (
--     id SERIAL PRIMARY KEY,
--     username VARCHAR(100) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE reviews (
--     id SERIAL PRIMARY KEY,
--     anime_id INT REFERENCES animes(id),
--     user_id INT REFERENCES users(id),
--     rating INT,
--     comment TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
