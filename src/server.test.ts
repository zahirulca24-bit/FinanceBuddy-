import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { getPortValue, validateProdEnvValue } from "./utils/env";
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
    it("1. default port returns 3000", () => {
      expect(getPortValue(undefined)).toBe(3000);
    });

    it("2. valid custom port is accepted", () => {
      expect(getPortValue("8080")).toBe(8080);
    });

    it("3. zero port is rejected", () => {
      expect(getPortValue("0")).toBeUndefined();
    });

    it("4. negative port is rejected", () => {
      expect(getPortValue("-8080")).toBeUndefined();
    });

    it("5. non-numeric port is rejected", () => {
      expect(getPortValue("abc")).toBeUndefined();
    });

    it("6. decimal/malformed port is rejected", () => {
      expect(getPortValue("3000.5")).toBeUndefined();
      expect(getPortValue("3000abc")).toBeUndefined();
    });

    it("7. missing production Supabase URL fails validation", () => {
      expect(validateProdEnvValue(undefined, "some-key")).toBe(false);
    });

    it("8. missing production Supabase anon key fails validation", () => {
      expect(validateProdEnvValue("https://example.supabase.co", undefined)).toBe(false);
    });

    it("9. invalid production Supabase URL fails validation", () => {
      expect(validateProdEnvValue("ftp://example.supabase.co", "some-key")).toBe(false);
      expect(validateProdEnvValue("", "some-key")).toBe(false);
      expect(validateProdEnvValue("not-a-valid-url", "some-key")).toBe(false);
    });
  });

  describe("API Safety and Authorization Requirements", () => {
    it("10. health response contains only safe process status", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("11. readiness response contains booleans/status only", async () => {
      const res = await request(app).get("/api/ready");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ready");
      expect(typeof res.body.checks.supabaseConfigured).toBe("boolean");
      expect(typeof res.body.checks.geminiConfigured).toBe("boolean");
    });

    it("12. readiness response never exposes keys or environment values", async () => {
      const res = await request(app).get("/api/ready");
      const bodyStr = JSON.stringify(res.body).toLowerCase();
      expect(bodyStr).not.toContain("key");
      expect(bodyStr).not.toContain("supabase_url");
      expect(bodyStr).not.toContain("secret");
    });

    it("13. missing bearer authentication returns 401", async () => {
      const res = await request(app).get("/api/backups");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Missing authorization token");
    });

    it("14. invalid bearer authentication returns 401", async () => {
      const res = await request(app)
        .get("/api/backups")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Unauthorized access");
    });

    it("15. authenticated normal user receives 403 on admin route", async () => {
      const res = await request(app)
        .get("/api/backups")
        .set("Authorization", "Bearer valid-user-token");
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Administrator privileges required");
    });

    it("16. verified admin receives access", async () => {
      const res = await request(app)
        .get("/api/backups")
        .set("Authorization", "Bearer valid-admin-token");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Secure Development Preview Session Verification", () => {
    it("17. preview login endpoint is unavailable in production", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const res = await request(app).post("/api/preview-session").send({});
      expect(res.status).toBe(403);

      process.env.NODE_ENV = originalNodeEnv;
    });

    it("18. preview login endpoint is unavailable when preview mode is disabled", async () => {
      const originalPreviewMode = process.env.VITE_ENABLE_PREVIEW_MODE;
      process.env.VITE_ENABLE_PREVIEW_MODE = "false";

      const res = await request(app).post("/api/preview-session").send({});
      expect(res.status).toBe(403);

      process.env.VITE_ENABLE_PREVIEW_MODE = originalPreviewMode;
    });

    it("19. preview session works only in development preview mode", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalPreviewMode = process.env.VITE_ENABLE_PREVIEW_MODE;
      process.env.NODE_ENV = "development";
      process.env.VITE_ENABLE_PREVIEW_MODE = "true";

      const res = await request(app).post("/api/preview-session").send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("success");

      process.env.NODE_ENV = originalNodeEnv;
      process.env.VITE_ENABLE_PREVIEW_MODE = originalPreviewMode;
    });

    it("20. preview session cookie is HttpOnly and SameSite=Strict", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalPreviewMode = process.env.VITE_ENABLE_PREVIEW_MODE;
      process.env.NODE_ENV = "development";
      process.env.VITE_ENABLE_PREVIEW_MODE = "true";

      const res = await request(app).post("/api/preview-session").send({});
      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      const cookieHeader = res.headers["set-cookie"][0].toLowerCase();
      expect(cookieHeader).toContain("httponly");
      expect(cookieHeader).toContain("samesite=strict");

      process.env.NODE_ENV = originalNodeEnv;
      process.env.VITE_ENABLE_PREVIEW_MODE = originalPreviewMode;
    });

    it("21. preview authentication works without hardcoded bearer credentials", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      const originalPreviewMode = process.env.VITE_ENABLE_PREVIEW_MODE;
      process.env.NODE_ENV = "development";
      process.env.VITE_ENABLE_PREVIEW_MODE = "true";

      const res = await request(app).post("/api/preview-session").send({});
      expect(res.status).toBe(200);
      const cookie = res.headers["set-cookie"][0].split(";")[0];

      const checkRes = await request(app)
        .get("/api/preview-session")
        .set("Cookie", cookie);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.user.email).toBe("admin@preview.local");

      process.env.NODE_ENV = originalNodeEnv;
      process.env.VITE_ENABLE_PREVIEW_MODE = originalPreviewMode;
    });
  });

  describe("File System Action Input Validation", () => {
    it("22. unsafe restore filenames are rejected", async () => {
      const res = await request(app)
        .post("/api/restore")
        .set("Authorization", "Bearer valid-admin-token")
        .send({ filename: "../malicious_traversal/db.json" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Unsafe filename");
    });

    it("23. safe restore filename reaches the safe execFile path", async () => {
      const res = await request(app)
        .post("/api/restore")
        .set("Authorization", "Bearer valid-admin-token")
        .send({ filename: "safe_file_name.json" });
      expect(res.status).not.toBe(400);
    });
  });
});
