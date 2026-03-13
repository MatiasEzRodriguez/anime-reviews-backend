/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

  it("should return 401 with incorrect password", async () => {
    const password = "correct_password";
    const wrongPassword = "wrong_password";
    const hash = bcrypt.hashSync(password, 10);
    const fakeResult = { rowCount: 1, rows: [{ id: 1, username: "ci_test", password_hash: hash }] } as any;
    vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve(fakeResult));

    const res = await request(app).post("/login").send({ username: "ci_test", password: wrongPassword });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Credenciales inválidas");
  });

  it("should return 401 with non-existent user", async () => {
    const fakeResult = { rowCount: 0, rows: [] } as any;
    vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve(fakeResult));

    const res = await request(app).post("/login").send({ username: "nonexistent", password: "somepass" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Credenciales inválidas");
  });

  it("should return 400 without credentials", async () => {
    const res = await request(app).post("/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username/email y password son requeridos");
  });
});

describe("users register", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should register successfully and return 201", async () => {
    // Mock check for existing user (returns none)
    const checkResult = { rowCount: 0, rows: [] } as any;
    // Mock insert user
    const insertResult = {
      rowCount: 1,
      rows: [{ id: 1, username: "newuser", email: "new@test.com", created_at: new Date() }],
    } as any;

    vi.spyOn(pool, "query")
      .mockImplementationOnce(() => Promise.resolve(checkResult))
      .mockImplementationOnce(() => Promise.resolve(insertResult));

    const res = await request(app).post("/register").send({
      username: "newuser",
      email: "new@test.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe("newuser");
    expect(res.body.user.email).toBe("new@test.com");
  });

  it("should return 409 with duplicate email", async () => {
    // Mock check for existing user (returns existing)
    const checkResult = { rowCount: 1, rows: [{ id: 1, username: "existing", email: "existing@test.com" }] } as any;

    vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve(checkResult));

    const res = await request(app).post("/register").send({
      username: "newuser",
      email: "existing@test.com",
      password: "password123",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Usuario o email ya existe");
  });

  it("should return 409 with duplicate username", async () => {
    // Mock check for existing user (returns existing)
    const checkResult = { rowCount: 1, rows: [{ id: 1, username: "existing", email: "other@test.com" }] } as any;

    vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve(checkResult));

    const res = await request(app).post("/register").send({
      username: "existing",
      email: "new@test.com",
      password: "password123",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Usuario o email ya existe");
  });

  it("should return 400 without data", async () => {
    const res = await request(app).post("/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username, email y password son requeridos");
  });

  it("should return 400 with invalid data", async () => {
    const res = await request(app).post("/register").send({
      username: "",
      email: "not-an-email",
      password: "",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("username, email y password son requeridos");
  });
});

describe("users /me endpoint", () => {
  const JWT_SECRET = process.env.JWT_SECRET ?? "change_this_secret";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("No autorizado");
  });

  it("should return 200 with valid token", async () => {
    const userId = 1;
    const username = "testuser";
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: "7d" });

    const fakeResult = {
      rowCount: 1,
      rows: [{ id: userId, username, email: "test@test.com", created_at: new Date() }],
    } as any;

    vi.spyOn(pool, "query").mockImplementationOnce(() => Promise.resolve(fakeResult));

    const res = await request(app).get("/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(userId);
    expect(res.body.user.username).toBe(username);
  });
});
