import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import request from 'supertest';

// Mock de node-fetch antes de importar el app
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import fetch from 'node-fetch';
import app from '../../services/mal-integration/main.js';

describe('MAL integration endpoints', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch = fetch as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /search', () => {
    it('retorna resultados de busqueda de anime', async () => {
      const mockSearchResults = {
        data: [
          { mal_id: 1, title: 'Cowboy Bebop', images: { jpg: { image_url: 'https://example.com/image.jpg' } } },
          { mal_id: 2, title: 'Naruto', images: { jpg: { image_url: 'https://example.com/naruto.jpg' } } },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
      } as unknown as Response);

      const res = await request(app).get('/search?q=Cowboy');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockSearchResults);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.jikan.moe/v4/anime?q=Cowboy&limit=5'
      );
    });

    it('retorna 400 si falta el parametro q', async () => {
      const res = await request(app).get('/search');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Falta el parámetro de búsqueda 'q'");
    });

    it('retorna 400 si el parametro q esta vacio', async () => {
      const res = await request(app).get('/search?q=');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Falta el parámetro de búsqueda 'q'");
    });

    it('llama a la API de Jikan correctamente con encodeURIComponent', async () => {
      const mockSearchResults = { data: [] };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults,
      } as unknown as Response);

      await request(app).get('/search?q=One%20Piece');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.jikan.moe/v4/anime?q=One%20Piece&limit=5'
      );
    });

    it('maneja errores de la API externa', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const res = await request(app).get('/search?q=Test');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al consultar MyAnimeList');
    });
  });

  describe('GET /anime/:malId', () => {
    it('retorna 400 si el malId es invalido (no es numero positivo)', async () => {
      const res = await request(app).get('/anime/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ID de MyAnimeList inválido');
    });

    it('retorna 400 si el malId es 0', async () => {
      const res = await request(app).get('/anime/0');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ID de MyAnimeList inválido');
    });

    it('retorna 400 si el malId es negativo', async () => {
      const res = await request(app).get('/anime/-5');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ID de MyAnimeList inválido');
    });

    it('retorna datos del anime desde Jikan API (ID: 100)', async () => {
      const mockAnimeData = {
        data: {
          mal_id: 100,
          title: 'Test Anime',
          synopsis: 'A great anime',
          images: { jpg: { image_url: 'https://example.com/test.jpg' } },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAnimeData,
      } as unknown as Response);

      const res = await request(app).get('/anime/100');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockAnimeData);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.jikan.moe/v4/anime/100'
      );
    });

    it('retorna 404 si el anime no existe en Jikan (ID: 999999)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      } as unknown as Response);

      const res = await request(app).get('/anime/999999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Anime no encontrado en MyAnimeList');
    });

    it('maneja errores de red (ID: 200)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const res = await request(app).get('/anime/200');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al consultar MyAnimeList');
    });

    it('segunda llamada con mismo ID retorna desde cache sin llamar a Jikan (ID: 300)', async () => {
      const mockAnimeData = {
        data: {
          mal_id: 300,
          title: 'Cached Anime',
          synopsis: 'This should be cached',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAnimeData,
      } as unknown as Response);

      const res1 = await request(app).get('/anime/300');
      expect(res1.status).toBe(200);
      expect(res1.body).toEqual(mockAnimeData);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const res2 = await request(app).get('/anime/300');
      expect(res2.status).toBe(200);
      expect(res2.body).toEqual(mockAnimeData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('el cache expira despues de 10 minutos (TTL) (ID: 400)', async () => {
      const mockAnimeData = {
        data: {
          mal_id: 400,
          title: 'Anime Before Expiry',
        },
      };

      vi.useFakeTimers();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAnimeData,
      } as unknown as Response);

      const res1 = await request(app).get('/anime/400');
      expect(res1.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(9 * 60 * 1000);

      const res2 = await request(app).get('/anime/400');
      expect(res2.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2 * 60 * 1000);

      const mockAnimeDataUpdated = {
        data: {
          mal_id: 400,
          title: 'Anime After Expiry',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockAnimeDataUpdated,
      } as unknown as Response);

      const res3 = await request(app).get('/anime/400');
      expect(res3.status).toBe(200);
      expect(res3.body).toEqual(mockAnimeDataUpdated);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('diferentes IDs de anime no comparten cache (IDs: 500, 600)', async () => {
      const mockAnime1 = { data: { mal_id: 500, title: 'Anime 500' } };
      const mockAnime2 = { data: { mal_id: 600, title: 'Anime 600' } };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnime1,
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockAnime2,
        } as unknown as Response);

      const res1 = await request(app).get('/anime/500');
      expect(res1.status).toBe(200);
      expect(res1.body).toEqual(mockAnime1);

      const res2 = await request(app).get('/anime/600');
      expect(res2.status).toBe(200);
      expect(res2.body).toEqual(mockAnime2);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
