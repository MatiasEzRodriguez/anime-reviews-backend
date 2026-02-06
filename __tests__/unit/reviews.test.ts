/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import request from "supertest";

import app from "../../services/reviews/app.js";
import { pool } from "../../services/reviews/db.js";
import jwt from "jsonwebtoken";

describe("reviews endpoints", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a review when authenticated", async () => {
    // mock jwt.verify to return userId
    vi.spyOn(jwt, "verify").mockReturnValue({ userId: 1 } as any);
    const created = { id: 10, user_id: 1, anime_id: 123, rating: 8, content: "Nice", created_at: new Date() };
    const spy = vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve({ rows: [created], rowCount: 1 } as any));

    const res = await request(app)
      .post("/reviews")
      .set("Authorization", "Bearer faketoken")
      .send({ anime_id: 123, rating: 8, content: "Nice" });

    expect(res.status).toBe(201);
    expect(res.body.review).toBeTruthy();
    expect(spy).toHaveBeenCalled();
  });

  it("lists reviews", async () => {
    const rows = [{ id: 10, user_id: 1, anime_id: 123, rating: 8, content: "Nice", username: "u1" }];
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({ rows, rowCount: 1 } as any);

    const res = await request(app).get("/reviews");
    expect(res.status).toBe(200);
    expect(res.body.reviews).toBeDefined();
    expect(spy).toHaveBeenCalled();
  });

  it("updates a review when owner", async () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ userId: 1 } as any);
    const existing = { id: 11, user_id: 1, anime_id: 123, rating: 7, content: "Old" };
    const updated = { ...existing, rating: 9, content: "Updated" };
    // First call: select review, Second call: update
    const spy = vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve({ rows: [existing], rowCount: 1 } as any)).mockImplementationOnce(() => Promise.resolve({ rows: [updated], rowCount: 1 } as any));

    const res = await request(app)
      .put("/reviews/11")
      .set("Authorization", "Bearer faketoken")
      .send({ rating: 9, content: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.review).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("forbids update when not owner", async () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ userId: 2 } as any);
    const existing = { id: 12, user_id: 1, anime_id: 123, rating: 7, content: "Old" };
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({ rows: [existing], rowCount: 1 } as any);

    const res = await request(app).put("/reviews/12").set("Authorization", "Bearer faketoken").send({ rating: 5 });
    expect(res.status).toBe(403);
    expect(spy).toHaveBeenCalled();
  });

  it("deletes a review when owner", async () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ userId: 3 } as any);
    const existing = { id: 13, user_id: 3, anime_id: 123 };
    // select then delete
    const spy = vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve({ rows: [existing], rowCount: 1 } as any)).mockImplementationOnce(() => Promise.resolve({ rowCount: 1 } as any));

    const res = await request(app).delete("/reviews/13").set("Authorization", "Bearer faketoken");
    expect(res.status).toBe(204);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("forbids delete when not owner", async () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ userId: 4 } as any);
    const existing = { id: 14, user_id: 5, anime_id: 123 };
    const spy = vi.spyOn(pool, "query").mockResolvedValueOnce({ rows: [existing], rowCount: 1 } as any);

    const res = await request(app).delete("/reviews/14").set("Authorization", "Bearer faketoken");
    expect(res.status).toBe(403);
    expect(spy).toHaveBeenCalled();
  });

  it("rejects invalid rating on create", async () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ userId: 6 } as any);
    const res = await request(app)
      .post("/reviews")
      .set("Authorization", "Bearer faketoken")
      .send({ anime_id: 200, rating: 11, content: "Too high" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/rating/);
  });
});
