/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";

// Import the app and pool (the app is the express app without listening)
import app from "../../services/users/app.js";
import { pool } from "../../services/users/db.js";

describe("users login", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should login with username", async () => {
    const password = "pass123";
    const hash = bcrypt.hashSync(password, 10);
    // Mock pool.query for username lookup
  const fakeResult = { rowCount: 1, rows: [{ id: 1, username: "ci_test", password_hash: hash }] } as any;
  const spy = vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve(fakeResult));

    const res = await request(app).post("/login").send({ username: "ci_test", password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(spy).toHaveBeenCalled();
  });

  it("should login with email", async () => {
    const password = "pass123";
    const hash = bcrypt.hashSync(password, 10);
    // Mock pool.query for email lookup
  const fakeResult2 = { rowCount: 1, rows: [{ id: 2, username: "ci_email", password_hash: hash }] } as any;
  const spy = vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve(fakeResult2));

    const res = await request(app).post("/login").send({ email: "test+ci@example.com", password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(spy).toHaveBeenCalled();
  });
});
