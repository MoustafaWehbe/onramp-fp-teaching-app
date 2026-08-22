import request from "supertest";
import { app } from "../../app";

// Mock the DB so we don't need a real database in unit tests
jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

jest.mock("../../src/services/auth.service", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  },
}));

import { authService } from "../../src/services/auth.service";
const mockAuthService = authService as jest.Mocked<typeof authService>;

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 201 with user data on success", async () => {
    mockAuthService.register.mockResolvedValue({
      id: "uuid-1",
      email: "alice@example.com",
      name: "Alice",
      role: "student",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "SecurePass1",
      name: "Alice",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("alice@example.com");
  });

  it("returns 422 when email is invalid", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "SecurePass1",
      name: "Alice",
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("email");
  });

  it("returns 422 when password is too weak", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "short",
      name: "Alice",
    });

    expect(res.status).toBe(422);
  });

  it("ignores a client-supplied instructor role and registers a student", async () => {
    mockAuthService.register.mockResolvedValue({
      id: "uuid-2",
      email: "student@example.com",
      name: "Student",
      role: "student",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "student@example.com",
      password: "SecurePass1",
      name: "Student",
      role: "instructor",
    });

    expect(res.status).toBe(201);
    expect(mockAuthService.register).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "SecurePass1",
      name: "Student",
    });
    expect(res.body.data.role).toBe("student");
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns the user and keeps tokens in HTTP-only cookies", async () => {
    mockAuthService.login.mockResolvedValue({
      user: {
        id: "uuid-1",
        email: "alice@example.com",
        name: "Alice",
        role: "student",
      },
      accessToken: "access.token.here",
      refreshToken: "refresh.token.here",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "SecurePass1" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      user: {
        id: "uuid-1",
        email: "alice@example.com",
        name: "Alice",
        role: "student",
      },
    });
    expect(res.body).not.toHaveProperty("accessToken");
    expect(res.body).not.toHaveProperty("refreshToken");
    expect(res.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/accessToken=access\.token\.here.*HttpOnly/i),
        expect.stringMatching(/refreshToken=refresh\.token\.here.*HttpOnly/i),
      ]),
    );
  });

  it("returns 422 when body is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(422);
  });
});
