/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import request from "supertest";

import app from "../../services/catalog/main.js";
import { pool } from "../../services/catalog/db.js";

describe("catalog ranking endpoints", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========== GET /ranking/top ==========
  describe("GET /ranking/top", () => {
    it("returns top animes by score in descending order", async () => {
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Top Anime 1", score: 9.5, episodes: 12, synopsis: "Great", import_date: new Date() },
        { id: 2, mal_id: 2, title: "Top Anime 2", score: 8.8, episodes: 24, synopsis: "Good", import_date: new Date() },
        { id: 3, mal_id: 3, title: "Top Anime 3", score: 8.5, episodes: 13, synopsis: "Nice", import_date: new Date() },
      ];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: mockAnimes.length,
      } as any);

      const res = await request(app).get("/ranking/top");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("metadata");
      expect(res.body.data).toHaveLength(3);
      expect(res.body.metadata.count).toBe(3);
      expect(res.body.metadata.limit).toBe(10); // default
      expect(spy).toHaveBeenCalled();
      
      // Verify query uses correct filters and ordering
      const query = spy.mock.calls[0][0] as string;
      expect(query).toContain("WHERE score IS NOT NULL");
      expect(query).toContain("ORDER BY score DESC");
      expect(query).toContain("LIMIT");
    });

    it("only includes animes with non-null score", async () => {
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Rated Anime", score: 8.0, episodes: 12, synopsis: null, import_date: new Date() },
      ];

      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: mockAnimes.length,
      } as any);

      const res = await request(app).get("/ranking/top");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("supports query param ?limit=N", async () => {
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Top 1", score: 9.0, episodes: 12, synopsis: null, import_date: new Date() },
      ];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: mockAnimes.length,
      } as any);

      const res = await request(app).get("/ranking/top?limit=5");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(5);
      
      // Verify the limit is passed to the query
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(5);
    });

    it("caps limit at maximum of 50", async () => {
      const mockAnimes: never[] = [];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/top?limit=100");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(50); // capped at 50
      
      // Verify the capped limit is passed to the query
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(50);
    });

    it("uses default limit of 10 when limit is invalid", async () => {
      const mockAnimes: never[] = [];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/top?limit=invalid");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(10); // default
      
      // Verify default limit is passed to the query
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(10);
    });

    it("returns empty array when no animes with score", async () => {
      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/top");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.metadata.count).toBe(0);
    });

    it("returns correct response format", async () => {
      const mockAnime = { id: 1, mal_id: 1, title: "Anime 1", score: 8.5, episodes: 12, synopsis: "Synopsis", import_date: new Date() };

      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: [mockAnime],
        rowCount: 1,
      } as any);

      const res = await request(app).get("/ranking/top");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(1);
      expect(res.body.data[0].title).toBe("Anime 1");
      expect(res.body.data[0].score).toBe(8.5);
      expect(res.body.metadata).toEqual({ count: 1, limit: 10 });
    });
  });

  // ========== GET /ranking/episodes ==========
  describe("GET /ranking/episodes", () => {
    it("returns animes with most episodes in descending order", async () => {
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Long Anime", score: 8.5, episodes: 500, synopsis: "Very long", import_date: new Date() },
        { id: 2, mal_id: 2, title: "Medium Anime", score: 7.8, episodes: 200, synopsis: "Medium", import_date: new Date() },
        { id: 3, mal_id: 3, title: "Short Anime", score: 9.0, episodes: 12, synopsis: "Short", import_date: new Date() },
      ];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: mockAnimes.length,
      } as any);

      const res = await request(app).get("/ranking/episodes");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("metadata");
      expect(res.body.data).toHaveLength(3);
      expect(res.body.metadata.count).toBe(3);
      expect(spy).toHaveBeenCalled();
      
      // Verify query uses correct filters and ordering
      const query = spy.mock.calls[0][0] as string;
      expect(query).toContain("WHERE episodes > 0");
      expect(query).toContain("ORDER BY episodes DESC");
      expect(query).toContain("LIMIT");
    });

    it("only includes animes with episodes greater than 0", async () => {
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Anime with episodes", score: 8.0, episodes: 24, synopsis: null, import_date: new Date() },
      ];

      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: mockAnimes.length,
      } as any);

      const res = await request(app).get("/ranking/episodes");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("supports query param ?limit=N", async () => {
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Long Anime", score: 8.0, episodes: 100, synopsis: null, import_date: new Date() },
      ];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: mockAnimes.length,
      } as any);

      const res = await request(app).get("/ranking/episodes?limit=3");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(3);
      
      // Verify the limit is passed to the query
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(3);
    });

    it("caps limit at maximum of 50", async () => {
      const mockAnimes: never[] = [];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/episodes?limit=100");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(50);
      
      // Verify the capped limit is passed to the query
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(50);
    });

    it("returns empty array when no animes with episodes", async () => {
      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/episodes");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.metadata.count).toBe(0);
    });

    it("returns correct response format", async () => {
      const mockAnime = { id: 1, mal_id: 1, title: "Long Anime", score: 8.5, episodes: 100, synopsis: "Long", import_date: new Date() };

      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: [mockAnime],
        rowCount: 1,
      } as any);

      const res = await request(app).get("/ranking/episodes");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(1);
      expect(res.body.data[0].title).toBe("Long Anime");
      expect(res.body.data[0].episodes).toBe(100);
      expect(res.body.metadata).toEqual({ count: 1, limit: 10 });
    });
  });

  // ========== GET /ranking/recent ==========
  describe("GET /ranking/recent", () => {
    it("returns recently imported animes in descending order by import_date", async () => {
      const now = new Date();
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Recent Anime 1", score: 8.5, episodes: 12, synopsis: "New", import_date: now },
        { id: 2, mal_id: 2, title: "Recent Anime 2", score: 7.8, episodes: 24, synopsis: "Newer", import_date: new Date(now.getTime() - 86400000) },
        { id: 3, mal_id: 3, title: "Recent Anime 3", score: 9.0, episodes: 13, synopsis: "Newest", import_date: new Date(now.getTime() - 172800000) },
      ];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: mockAnimes.length,
      } as any);

      const res = await request(app).get("/ranking/recent");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("metadata");
      expect(res.body.data).toHaveLength(3);
      expect(res.body.metadata.count).toBe(3);
      expect(spy).toHaveBeenCalled();
      
      // Verify query uses correct ordering
      const query = spy.mock.calls[0][0] as string;
      expect(query).toContain("ORDER BY import_date DESC");
      expect(query).toContain("LIMIT");
    });

    it("supports query param ?limit=N", async () => {
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Recent Anime", score: 8.0, episodes: 12, synopsis: null, import_date: new Date() },
      ];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: mockAnimes.length,
      } as any);

      const res = await request(app).get("/ranking/recent?limit=5");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(5);
      
      // Verify the limit is passed to the query
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(5);
    });

    it("caps limit at maximum of 50", async () => {
      const mockAnimes: never[] = [];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/recent?limit=100");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(50);
      
      // Verify the capped limit is passed to the query
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(50);
    });

    it("returns empty array when no animes imported", async () => {
      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/recent");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.metadata.count).toBe(0);
    });

    it("returns correct response format", async () => {
      const mockAnime = { id: 1, mal_id: 1, title: "Recent Anime", score: 8.5, episodes: 12, synopsis: "New", import_date: new Date() };

      vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: [mockAnime],
        rowCount: 1,
      } as any);

      const res = await request(app).get("/ranking/recent");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(1);
      expect(res.body.data[0].title).toBe("Recent Anime");
      expect(res.body.metadata).toEqual({ count: 1, limit: 10 });
    });
  });

  // ========== Edge cases ==========
  describe("edge cases", () => {
    it("returns 500 when database query fails", async () => {
      vi.spyOn(pool, "query").mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app).get("/ranking/top");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
    });

    it("handles limit of 1 correctly", async () => {
      const mockAnimes = [
        { id: 1, mal_id: 1, title: "Top Anime", score: 9.5, episodes: 12, synopsis: null, import_date: new Date() },
      ];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: 1,
      } as any);

      const res = await request(app).get("/ranking/top?limit=1");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(1);
      
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(1);
    });

    it("handles negative limit by using default", async () => {
      const mockAnimes: never[] = [];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/top?limit=-5");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(10); // default
      
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(10);
    });

    it("handles zero limit by using default", async () => {
      const mockAnimes: never[] = [];

      const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({
        rows: mockAnimes,
        rowCount: 0,
      } as any);

      const res = await request(app).get("/ranking/top?limit=0");

      expect(res.status).toBe(200);
      expect(res.body.metadata.limit).toBe(10); // default
      
      const queryParams = spy.mock.calls[0][1] as number[];
      expect(queryParams[0]).toBe(10);
    });
  });
});
