import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { execFile } from "child_process";
import { getPortValue, validateProdEnvValue } from "./src/utils/env";

dotenv.config();

const getPort = (): number => {
  const portStr = process.env.PORT;
  const port = getPortValue(portStr);
  if (port === undefined) {
    console.error(`CRITICAL: Port value "${portStr}" is invalid. PORT must be a positive integer.`);
    process.exit(1);
  }
  return port;
};

const PORT = getPort();

const validateProdEnv = () => {
  if (process.env.NODE_ENV === "production") {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;

    if (!validateProdEnvValue(url, key)) {
      console.error("CRITICAL: Missing or invalid Supabase configuration in production environment.");
      console.error("Ensure that VITE_SUPABASE_URL (valid http/https URL) and VITE_SUPABASE_ANON_KEY are set.");
      process.exit(1);
    }
  }
};

validateProdEnv();

const app = express();

// Apply security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// Route-specific parser limits to protect from large payload attacks on other routes
const jsonParser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isUpload = req.path === "/api/extract" || req.path === "/api/reconcile-extract";
  const limit = isUpload ? "15mb" : "2mb";
  express.json({ limit })(req, res, next);
};

const urlencodedParser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isUpload = req.path === "/api/extract" || req.path === "/api/reconcile-extract";
  const limit = isUpload ? "15mb" : "2mb";
  express.urlencoded({ limit, extended: true })(req, res, next);
};

app.use(jsonParser);
app.use(urlencodedParser);

// Rate limiting configurations
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests to AI services. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: { error: "Too many administrative requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Shared server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Server-side Supabase client for session JWT token verification
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabaseServer = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

const activePreviewSessions = new Set<string>();

const getCookie = (cookieHeader: string | undefined, name: string): string | undefined => {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? match[2] : undefined;
};

// Middleware to secure endpoints and validate Supabase Access Tokens (JWT)
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isPreviewEnabled = process.env.VITE_ENABLE_PREVIEW_MODE === "true";

  // Check safe 503 for production authentication misconfiguration
  if (isProduction && (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY)) {
    return res.status(503).json({ error: "Service Unavailable: Authentication service misconfigured." });
  }

  // 1. Check secure preview cookie (only in development preview mode)
  if (!isProduction && isPreviewEnabled) {
    const cookieHeader = req.headers.cookie;
    const sessionCookie = getCookie(cookieHeader, "preview_session");
    if (sessionCookie && activePreviewSessions.has(sessionCookie)) {
      (req as any).user = {
        id: "00000000-0000-0000-0000-000000000000",
        email: "admin@preview.local",
        app_metadata: { role: "preview-admin" }
      };
      return next();
    }
  }

  // 2. Validate Supabase bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization token. Please log in first." });
  }

  const token = authHeader.replace("Bearer ", "");

  if (token === "preview-token") {
    return res.status(401).json({ error: "Unauthorized access: Invalid token." });
  }

  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: "Service Unavailable: Authentication service misconfigured." });
  }

  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized access: Session expired or invalid." });
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Unauthorized access: Session token verification failed." });
  }
};

// Middleware to authorize administrators
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User session not found." });
  }

  const isProduction = process.env.NODE_ENV === "production";
  const isPreviewEnabled = process.env.VITE_ENABLE_PREVIEW_MODE === "true";

  // Check if they are a development-only preview admin
  if (!isProduction && isPreviewEnabled && user.app_metadata?.role === "preview-admin") {
    return next();
  }

  const isSupabaseAdmin = user.app_metadata?.role === "admin";

  const adminEmailsString = process.env.ADMIN_EMAILS || "";
  const adminEmails = adminEmailsString.split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  const isEmailAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;

  if (isSupabaseAdmin || isEmailAdmin) {
    return next();
  }

  return res.status(403).json({ error: "Forbidden: Administrator privileges required." });
};

// API route: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// API route: Readiness Check
app.get("/api/ready", (req, res) => {
  const hasSupabaseConfig = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
  const hasGeminiConfig = !!process.env.GEMINI_API_KEY;

  const isProduction = process.env.NODE_ENV === "production";
  const isReady = isProduction ? (hasSupabaseConfig && hasGeminiConfig) : true;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "not_ready",
    checks: {
      supabaseConfigured: hasSupabaseConfig,
      geminiConfigured: hasGeminiConfig,
    }
  });
});

// API route: AI Transaction Extraction (Secured)
app.post("/api/extract", requireAuth, aiLimiter, async (req, res) => {
  try {
    const { fileData, mimeType, fileName } = req.body;

    const supportedMimeTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "Missing required fields: fileData and mimeType are required." });
    }

    if (!supportedMimeTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: `Unsupported file type: "${mimeType}". Supported types are PDF and images (PNG, JPEG, WebP, GIF).` });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.",
      });
    }

    // Convert file base64 data to GoogleGenAI parts format
    const filePart = {
      inlineData: {
        data: fileData,
        mimeType: mimeType,
      },
    };

    const promptText = `
      You are an expert AI accounting assistant.
      Extract transaction details from the uploaded document/receipt/statement (named: "${fileName || "unknown"}").
      Determine if it is an Income, Expense, or Transfer transaction.
      Identify the date, amount, account (Cash, Bank account, bKash, Nagad, Rocket, Credit card, Loan account, etc.), category, description, payment method, reference number, and any special notes.
      If the year is not clear in the document, assume 2026.
      Provide the result strictly matching the requested JSON schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [filePart, { text: promptText }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: {
              type: Type.STRING,
              description: "Transaction date in YYYY-MM-DD format. Must be string of format YYYY-MM-DD. If missing/unclear, use empty string.",
            },
            type: {
              type: Type.STRING,
              enum: ["Income", "Expense", "Transfer"],
              description: "Must be 'Income', 'Expense', or 'Transfer'. Default to 'Expense' if unclear.",
            },
            amount: {
              type: Type.NUMBER,
              description: "The total transaction amount in decimal number. If not clear, set to 0.",
            },
            account: {
              type: Type.STRING,
              description: "Best match for account name (Cash, Bank account, bKash, Nagad, Rocket, Credit card, Loan account, Investment account). Default to empty string if unclear.",
            },
            category: {
              type: Type.STRING,
              description: "Suggested standard category. Income: Salary, Bonus, Freelance income, Interest income, Other income. Expense: Food, Transport, Rent, Utility bills, Shopping, Medical, Education, Family expense, Office expense, Loan payment, Other expense.",
            },
            description: {
              type: Type.STRING,
              description: "A short, clean description summarizing the transaction.",
            },
            paymentMethod: {
              type: Type.STRING,
              description: "Method of payment, e.g. Cash, Card, Bank Transfer, Mobile Banking.",
            },
            referenceNumber: {
              type: Type.STRING,
              description: "Reference number, transaction ID, receipt ID, check number, or voucher number.",
            },
            notes: {
              type: Type.STRING,
              description: "Any extra itemized details, merchant name, or notes.",
            },
          },
          required: ["type", "amount", "description"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    const result = JSON.parse(text);
    return res.json(result);
  } catch (error: any) {
    console.error("AI extraction error:", error);
    return res.status(500).json({ error: error.message || "Failed to extract transaction details" });
  }
});

// API route: Bank Statement Extraction (PDF & Images) (Secured)
app.post("/api/reconcile-extract", requireAuth, aiLimiter, async (req, res) => {
  try {
    const { fileData, mimeType, fileName } = req.body;

    const supportedMimeTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: "Missing required fields: fileData and mimeType are required." });
    }

    if (!supportedMimeTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: `Unsupported file type: "${mimeType}". Supported types are PDF and images (PNG, JPEG, WebP, GIF).` });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.",
      });
    }

    const filePart = {
      inlineData: {
        data: fileData,
        mimeType: mimeType,
      },
    };

    const promptText = `
      You are an expert financial auditor and AI accounting assistant.
      Your task is to extract bank statement transactions from the provided document (named: "${fileName || "unknown"}").
      
      Carefully inspect any tables, listings, or rows. Extract:
      1. Opening Balance and Closing Balance if visible on the statement.
      2. The list of transaction rows. For each row, extract:
         - Date: The transaction date. MUST be strictly in YYYY-MM-DD format. If year is omitted or unclear, assume 2026.
         - Description: Particulars, transaction details, payee, or transaction description.
         - ReferenceNumber: Cheque number, reference number, or transaction ID if available.
         - Debit: The debit amount (money leaving the account / withdrawals / payments). Set to 0 if there is none.
         - Credit: The credit amount (money entering the account / deposits / receipts). Set to 0 if there is none.
         - RunningBalance: The running balance displayed after this transaction. Set to 0 if not available.

      Please ensure all numeric values are numbers, not strings.
      Provide the result strictly matching the requested JSON schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [filePart, { text: promptText }],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            openingBalance: {
              type: Type.NUMBER,
              description: "Statement opening balance if detected, otherwise 0.",
            },
            closingBalance: {
              type: Type.NUMBER,
              description: "Statement closing balance if detected, otherwise 0.",
            },
            transactions: {
              type: Type.ARRAY,
              description: "List of extracted transactions from the statement.",
              items: {
                type: Type.OBJECT,
                properties: {
                  date: {
                    type: Type.STRING,
                    description: "Transaction date strictly in YYYY-MM-DD format.",
                  },
                  description: {
                    type: Type.STRING,
                    description: "Detailed description of the transaction.",
                  },
                  referenceNumber: {
                    type: Type.STRING,
                    description: "Cheque, voucher, reference or transaction ID if available, else empty string.",
                  },
                  debit: {
                    type: Type.NUMBER,
                    description: "Debit amount (withdrawals / payments) as positive number. 0 if none.",
                  },
                  credit: {
                    type: Type.NUMBER,
                    description: "Credit amount (deposits / receipts) as positive number. 0 if none.",
                  },
                  runningBalance: {
                    type: Type.NUMBER,
                    description: "Running balance after this transaction. 0 if none.",
                  },
                },
                required: ["date", "description", "debit", "credit"],
              },
            },
          },
          required: ["transactions"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API for bank statement extraction");
    }

    const result = JSON.parse(text);
    return res.json(result);
  } catch (error: any) {
    console.error("Bank statement extraction error:", error);
    return res.status(500).json({ error: error.message || "Failed to extract bank statement" });
  }
});

// API route: AI Adviser Analysis (Secured)
app.post("/api/advisor/analyze", requireAuth, aiLimiter, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.",
      });
    }

    const { transactions, accounts, reconciliations, taxCalculations, taxConfigurations } = req.body;

    const dataPrompt = `
      Here is the user's financial ledger context:
      - Accounts: ${JSON.stringify(accounts || [])}
      - Transactions: ${JSON.stringify(transactions || [])}
      - Bank Reconciliations: ${JSON.stringify(reconciliations || [])}
      - Tax Calculations: ${JSON.stringify(taxCalculations || [])}
      - Tax Configurations: ${JSON.stringify(taxConfigurations || [])}
 
      Analyze this context and return:
      1. A conversational "financialHealthSummary" summarizing their overall current health, income vs expense trend, savings trend, and cash flow status.
      2. An array of "insights" representing actionable advice based on:
         - Income vs expense trends
         - Category-wise spending
         - Large/unusual transactions
         - Overdue receivables or payables
         - Bank reconciliation status (unmatched rows, non-zero differences)
         - Tax status (missing tax info, estimated tax calculations, gaps)
         - Slabs or rebate opportunities
      3. An array of "alerts" identifying specific financial anomalies.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: dataPrompt,
      config: {
        systemInstruction: `
          You are Google AI Adviser, an expert, objective, and highly professional financial adviser integrated inside "Finance Buddy".
          Your goal is to analyze the user's financial data and provide explainable, actionable insights and recommended actions.
 
          Rules:
          1. Always analyze only the user's saved app data.
          2. Under no circumstances invent or suggest fake transactions or data. If data is empty or near-empty, return an empty array of insights and alerts, and set the financialHealthSummary to exactly "Add transactions and financial records to receive personalized AI insights." as required.
          3. Every recommendation or insight must be fully explainable. Show: What was detected, Why it matters, Which transactions/records support it, Recommended action, Confidence level (High, Medium, Low), and target Tab (one of: "tax", "reconciliation", "add", "dashboard", "accounts").
          4. Always label any tax-related advice, liability calculations, or suggestions as "Estimated". Do NOT claim to provide legal or professional tax advice. Do not invent tax rules; use only the active tax configuration.
          5. In bank reconciliation guidance, explain unmatched rows or ledger differences, but NEVER automatically match transactions or perform postings.
          6. Safe Action Controls: The AI Adviser must never automatically create, edit, or delete transactions, or change database data. For suggested actions, provide a clear structured preview (e.g. proposed transaction parameters) so the frontend can show a preview and route the user with explicit user confirmation.
          7. Return only a valid JSON response matching the requested schema.
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            financialHealthSummary: {
              type: Type.STRING,
              description: "Conversational summary of overall financial health. If empty data, must be exactly: 'Add transactions and financial records to receive personalized AI insights.'"
            },
            insights: {
              type: Type.ARRAY,
              description: "Actionable, high-value financial recommendations.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  whatDetected: { type: Type.STRING },
                  whyItMatters: { type: Type.STRING },
                  recommendedAction: { type: Type.STRING },
                  targetTab: { 
                    type: Type.STRING,
                    description: "Strictly one of: 'tax', 'reconciliation', 'add', 'dashboard', 'accounts'"
                  },
                  supportingRecords: { 
                    type: Type.STRING,
                    description: "Summary of supporting records or transaction descriptions/dates."
                  },
                  confidenceLevel: { 
                    type: Type.STRING,
                    description: "Must be 'High', 'Medium', or 'Low'."
                  },
                  previewData: {
                    type: Type.OBJECT,
                    description: "Safe actions parameter preview, e.g. { type: 'Expense', amount: 120, description: 'Bank charges match' } if applicable. Keep optional.",
                    properties: {
                      type: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      category: { type: Type.STRING },
                      description: { type: Type.STRING }
                    }
                  }
                },
                required: ["title", "whatDetected", "whyItMatters", "recommendedAction", "targetTab", "supportingRecords", "confidenceLevel"]
              }
            },
            alerts: {
              type: Type.ARRAY,
              description: "Identified warnings, risks, or successes.",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { 
                    type: Type.STRING,
                    description: "Must be 'danger', 'warning', or 'success'."
                  },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  sourceModule: { 
                    type: Type.STRING,
                    description: "Must be 'tax', 'reconciliation', 'transactions', or 'accounts'."
                  }
                },
                required: ["type", "title", "description", "sourceModule"]
              }
            }
          },
          required: ["financialHealthSummary", "insights", "alerts"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API for analysis");
    }

    const result = JSON.parse(text);
    return res.json(result);
  } catch (error: any) {
    console.error("AI analysis error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze financial ledger" });
  }
});

// API route: AI Adviser Chat (Secured)
app.post("/api/advisor/chat", requireAuth, aiLimiter, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets.",
      });
    }

    const { message, history, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing user message" });
    }

    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    const chatSession = ai.chats.create({
      model: "gemini-3.5-flash",
      history: formattedHistory,
      config: {
        systemInstruction: `
          You are Google AI Adviser, an expert, objective, and highly professional financial adviser integrated inside "Finance Buddy".
          You are conversing with the user about their financial data.
 
          Rules:
          1. Answer only from the user's saved app data provided in the context below. If there is no data, tell the user politely: "Add transactions and financial records to receive personalized AI insights."
          2. Keep your answers clear, explainable, and focused on the user's actual transactions.
          3. Always ground your calculations, amounts, or answers in the user's actual numbers. Do NOT hallucinate transactions, accounts, or ledger values.
          4. If asked about taxes, always label all tax numbers or outputs as "Estimated", state clearly that you do not provide legal or professional tax advice, and do not invent tax rules. Speak only using the active tax configuration.
          5. If asked about bank reconciliation, explain unmatched rows, suggest possible matches, or explain reconciliation differences, but do not automatically change data.
          6. If recommending a transaction creation, modification, or deletion, present it as a suggestion with a clear preview of what to change, and direct the user to confirm and proceed in the correct existing module.
          7. Speak in a friendly, helpful, and professional tone. Avoid self-praising adjectives or clinical developer jargon.
          8. Below is the full financial context of the application. Refer to this as the absolute source of truth.
 
          User's Current Financial Context:
          - Accounts: ${JSON.stringify(context?.accounts || [])}
          - Transactions: ${JSON.stringify(context?.transactions || [])}
          - Bank Reconciliations: ${JSON.stringify(context?.reconciliations || [])}
          - Tax Calculations: ${JSON.stringify(context?.taxCalculations || [])}
          - Tax Configurations: ${JSON.stringify(context?.taxConfigurations || [])}
        `,
      }
    });

    const chatResponse = await chatSession.sendMessage({ message: message });
    const replyText = chatResponse.text;

    return res.json({ text: replyText });
  } catch (error: any) {
    console.error("AI Adviser chat error:", error);
    return res.status(500).json({ error: error.message || "Failed to communicate with AI Adviser" });
  }
});

// ====================================================================
// SYSTEM MANAGEMENT & RELIABLE BACKUP / RECOVERY & AUDIT LOGGING
// ====================================================================

import fs from "fs";

const BACKUPS_DIR = path.join(process.cwd(), "backups");
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// 1. POST /api/audit - Record an audit log
app.post("/api/audit", requireAuth, async (req, res) => {
  try {
    const { action, table, recordId, oldValue, newValue } = req.body;
    const user = (req as any).user;
    
    if (!action || !table || !recordId) {
      return res.status(400).json({ error: "Missing required audit fields: action, table, recordId" });
    }
    
    const auditRecord = {
      user: user?.email || "admin@preview.local",
      userId: user?.id || "00000000-0000-0000-0000-000000000000",
      action,
      table,
      recordId,
      oldValue: oldValue || null,
      newValue: newValue || null,
      timestamp: new Date().toISOString()
    };
    
    const logLine = JSON.stringify(auditRecord) + "\n";
    fs.appendFileSync(path.join(BACKUPS_DIR, "audit_logs.jsonl"), logLine);
    
    return res.json({ status: "success", record: auditRecord });
  } catch (error: any) {
    console.error("Audit log error:", error);
    return res.status(500).json({ error: "Failed to record audit log: " + error.message });
  }
});

// 2. GET /api/audit - Get all audit logs (Admin-Only, Rate-Limited)
app.get("/api/audit", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  try {
    const auditFile = path.join(BACKUPS_DIR, "audit_logs.jsonl");
    if (!fs.existsSync(auditFile)) {
      return res.json([]);
    }
    
    const content = fs.readFileSync(auditFile, "utf-8");
    const logs = content
      .split("\n")
      .filter(line => line.trim() !== "")
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(log => log !== null);
      
    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return res.json(logs);
  } catch (error: any) {
    console.error("Fetch audit logs error:", error);
    return res.status(500).json({ error: "Failed to fetch audit logs: " + error.message });
  }
});

// 3. GET /api/backups - List all available backups (Admin-Only, Rate-Limited)
app.get("/api/backups", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(BACKUPS_DIR);
    const backupFiles = files
      .filter(file => file.startsWith("backup_") && file.endsWith(".json"))
      .map(file => {
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime || stats.mtime
        };
      });
      
    // Sort descending by creation date
    backupFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return res.json(backupFiles);
  } catch (error: any) {
    console.error("List backups error:", error);
    return res.status(500).json({ error: "Failed to list backups: " + error.message });
  }
});

// 4. POST /api/backup - Trigger manual backup (Admin-Only, Rate-Limited, Safe Exec)
app.post("/api/backup", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  try {
    execFile("python3", ["backup_restore.py", "backup"], (error, stdout, stderr) => {
      if (error) {
        console.error("Backup failed:", stderr || error.message);
        return res.status(500).json({ error: "Database backup execution failed. Check server logs." });
      }
      console.log("Backup stdout:", stdout);
      return res.json({ status: "success", message: "Database backup completed successfully." });
    });
  } catch (error: any) {
    console.error("Manual backup error:", error);
    return res.status(500).json({ error: "Failed to trigger backup. Check server logs." });
  }
});

// 5. POST /api/restore - Trigger database restore (Admin-Only, Rate-Limited, Safe Exec)
app.post("/api/restore", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Missing filename for restore." });
    }
    
    // Reject restore filenames when directory traversal is attempted
    if (filename !== path.basename(filename)) {
      return res.status(400).json({ error: "Unsafe filename. Directory traversal characters or paths are not allowed." });
    }
    const safeFilename = filename;
    
    execFile("python3", ["backup_restore.py", "restore", safeFilename], (error, stdout, stderr) => {
      if (error) {
        console.error("Restore failed:", stderr || error.message);
        return res.status(500).json({ error: "Database restore execution failed. Check server logs." });
      }
      console.log("Restore stdout:", stdout);
      return res.json({ status: "success", message: "Database restore completed successfully." });
    });
  } catch (error: any) {
    console.error("Restore error:", error);
    return res.status(500).json({ error: "Failed to trigger restore. Check server logs." });
  }
});

// 6. POST /api/backup/auto - Trigger automatic backup check (Admin-Only, Rate-Limited, Safe Exec)
app.post("/api/backup/auto", requireAuth, requireAdmin, adminLimiter, async (req, res) => {
  try {
    execFile("python3", ["backup_restore.py", "auto_backup"], (error, stdout, stderr) => {
      if (error) {
        console.error("Auto backup failed:", stderr || error.message);
        return res.status(500).json({ error: "Automatic backup execution failed. Check server logs." });
      }
      console.log("Auto backup stdout:", stdout);
      return res.json({ status: "success", message: "Automatic backup completed successfully." });
    });
  } catch (error: any) {
    console.error("Auto backup error:", error);
    return res.status(500).json({ error: "Failed to trigger automatic backup. Check server logs." });
  }
});

// ====================================================================
// DEVELOPMENT PREVIEW SESSION MANAGEMENT (Development-Only)
// ====================================================================

// POST /api/preview-session - Initialize preview session
app.post("/api/preview-session", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isPreviewEnabled = process.env.VITE_ENABLE_PREVIEW_MODE === "true";

  if (isProduction || !isPreviewEnabled) {
    return res.status(403).json({ error: "Preview session mode is disabled in this environment." });
  }

  // Generate a cryptographically secure random session ID
  const sessionId = require("crypto").randomBytes(32).toString("hex");
  activePreviewSessions.add(sessionId);

  // Set standard HttpOnly, SameSite=Strict cookie
  res.cookie("preview_session", sessionId, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  return res.json({
    status: "success",
    user: {
      id: "00000000-0000-0000-0000-000000000000",
      email: "admin@preview.local",
      role: "preview-admin"
    }
  });
});

// GET /api/preview-session - Validate active preview session
app.get("/api/preview-session", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isPreviewEnabled = process.env.VITE_ENABLE_PREVIEW_MODE === "true";

  if (isProduction || !isPreviewEnabled) {
    return res.status(403).json({ error: "Preview session mode is disabled in this environment." });
  }

  const cookieHeader = req.headers.cookie;
  const sessionCookie = getCookie(cookieHeader, "preview_session");

  if (sessionCookie && activePreviewSessions.has(sessionCookie)) {
    return res.json({
      status: "success",
      user: {
        id: "00000000-0000-0000-0000-000000000000",
        email: "admin@preview.local",
        role: "preview-admin"
      }
    });
  }

  return res.status(401).json({ error: "No active preview session found." });
});

// POST /api/preview-session/logout - End preview session
app.post("/api/preview-session/logout", (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isPreviewEnabled = process.env.VITE_ENABLE_PREVIEW_MODE === "true";

  if (isProduction || !isPreviewEnabled) {
    return res.status(403).json({ error: "Preview session mode is disabled in this environment." });
  }

  const cookieHeader = req.headers.cookie;
  const sessionCookie = getCookie(cookieHeader, "preview_session");

  if (sessionCookie) {
    activePreviewSessions.delete(sessionCookie);
  }

  res.clearCookie("preview_session", {
    httpOnly: true,
    sameSite: "strict",
    path: "/"
  });

  return res.json({ status: "success", message: "Preview session terminated." });
});

// Vite / static file serving integration
async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  main().catch((err) => {
    console.error("Failed to start server:", err);
  });
}

export { app };
