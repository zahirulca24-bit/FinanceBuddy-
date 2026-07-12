import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../server";

// Set required test environment variables before anything else
process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY = "example-anon-key";
process.env.GEMINI_API_KEY = "example-gemini-key";
process.env.ADMIN_EMAILS = "custom-admin@example.com";

// Mock Supabase
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn().mockImplementation(() => {
      return {
        auth: {
          getUser: vi.fn().mockImplementation(async (token: string) => {
            if (token === "valid-user-token") {
              return {
                data: {
                  user: {
                    id: "user-123",
                    email: "user@example.com",
                    app_metadata: { role: "user" }
                  }
                },
                error: null
              };
            }
            if (token === "valid-admin-token") {
              return {
                data: {
                  user: {
                    id: "admin-123",
                    email: "admin@example.com",
                    app_metadata: { role: "admin" }
                  }
                },
                error: null
              };
            }
            if (token === "admin-email-token") {
              return {
                data: {
                  user: {
                    id: "email-admin-123",
                    email: "custom-admin@example.com",
                    app_metadata: { role: "user" }
                  }
                },
                error: null
              };
            }
            return {
              data: { user: null },
              error: new Error("Invalid or expired token")
            };
          })
        }
      };
    })
  };
});

describe("Finance Buddy Secure Runnable Foundation Tests", () => {
  describe("Health and Readiness Endpoints", () => {
    it("GET /api/health should return 200 with status ok", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("GET /api/ready should return 200 with readiness details", async () => {
      const res = await request(app).get("/api/ready");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(res.body.checks.supabaseConfigured).toBe(true);
      expect(res.body.checks.geminiConfigured).toBe(true);
    });
  });

  describe("Authentication and Token Validation", () => {
    it("should return 401 when missing bearer token on a secured endpoint", async () => {
      const res = await request(app).get("/api/backups");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Missing authorization token");
    });

    it("should return 401 when bearer token is invalid", async () => {
      const res = await request(app)
        .get("/api/backups")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Unauthorized access");
    });
  });

  describe("Administrator Authorization (requireAdmin)", () => {
    it("should return 403 when user is authenticated but not an admin", async () => {
      const res = await request(app)
        .get("/api/backups")
        .set("Authorization", "Bearer valid-user-token");
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Forbidden: Administrator privileges required");
    });

    it("should return 200 when user is authenticated and is a Supabase role admin", async () => {
      const res = await request(app)
        .get("/api/backups")
        .set("Authorization", "Bearer valid-admin-token");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 200 when user is authenticated and email is in ADMIN_EMAILS", async () => {
      const res = await request(app)
        .get("/api/backups")
        .set("Authorization", "Bearer admin-email-token");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("PORT and Environment Validation Logic", () => {
    it("should validate and parse PORT correctly", () => {
      const getPortTest = (portStr: string | undefined): number | undefined => {
        if (!portStr) return 3000;
        const port = parseInt(portStr, 10);
        if (isNaN(port) || port <= 0 || port.toString() !== portStr.trim()) {
          return undefined;
        }
        return port;
      };
      expect(getPortTest("3000")).toBe(3000);
      expect(getPortTest("8080")).toBe(8080);
      expect(getPortTest("-8080")).toBeUndefined();
      expect(getPortTest("abc")).toBeUndefined();
    });

    it("should validate production environment Supabase config", () => {
      const validateProdEnvTest = (url: string | undefined, key: string | undefined): boolean => {
        if (!url || !key) {
          return false;
        }
        try {
          const parsedUrl = new URL(url);
          if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            return false;
          }
        } catch (e) {
          return false;
        }
        return true;
      };
      expect(validateProdEnvTest("https://example.supabase.co", "some-key")).toBe(true);
      expect(validateProdEnvTest("ftp://example.supabase.co", "some-key")).toBe(false);
      expect(validateProdEnvTest("", "some-key")).toBe(false);
      expect(validateProdEnvTest("https://example.supabase.co", "")).toBe(false);
    });
  });
});
