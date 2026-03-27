import 'dotenv/config';
import express from "express";
import crypto from "crypto";
console.log("Server starting...");
import multer from "multer";
import path from "path";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

import { supabaseAdmin } from "./server/supabase.js";

const app = express();
const PORT = 3000;

// Helper to generate a unique ID safely
function generateId() {
  try {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString('hex');
  } catch (e) {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// In-memory fallback for testing without a database
const inMemoryResumes: any[] = [];

// Helper to check if Supabase is actually configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  return url && !url.includes('placeholder');
};

// Helper to wrap promises with a timeout
const withTimeout = <T>(promise: PromiseLike<T>, timeoutMs: number = 5000): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([
    Promise.resolve(promise),
    timeoutPromise
  ]).finally(() => clearTimeout(timeoutHandle));
};

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get("/api/health", async (req, res) => {
  console.log("[HEALTH] Health check requested");
  let supabaseStatus = "not_configured";
  if (isSupabaseConfigured()) {
    try {
      const { error } = await withTimeout(supabaseAdmin.from('resumes').select('id').limit(1), 3000);
      supabaseStatus = error ? `error: ${error.message}` : "connected";
    } catch (e: any) {
      supabaseStatus = `critical_error: ${e.message}`;
    }
  }

  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL || !!process.env.VERCEL_ENV || !!process.env.VERCEL_URL,
    hasApiKey: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
    supabase: supabaseStatus
  });
});

app.get("/api/ping", (req, res) => {
  res.json({ message: "pong", time: new Date().toISOString() });
});

// API Route for submitting a resume
app.post("/api/submit", async (req, res) => {
  try {
    const { content, userId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Resume content is required" });
    }

    // Only pass user_id to Supabase if it's a valid UUID, otherwise let it be null
    const isValidUuid = (id: any) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const uid = isValidUuid(userId) ? userId : null;

    try {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
      
      console.log(`Attempting to save resume to Supabase. Content size: ${JSON.stringify(content).length} chars`);
      
      // 1. Save resume as pending
      const insertData: any = { content, status: 'pending' };
      if (uid) insertData.user_id = uid;

      const { data: resume, error: resumeError } = await withTimeout(
        supabaseAdmin
          .from('resumes')
          .insert([insertData])
          .select()
          .single(),
        8000
      );

      if (resumeError) {
        console.error("Supabase insert error:", resumeError);
        throw resumeError;
      }

      console.log(`Resume saved to Supabase with ID: ${resume.id}`);

      // 2. Log the action
      const logData: any = { action: 'resume_submitted', details: { resume_id: resume.id } };
      if (uid) logData.user_id = uid;

      try {
        await withTimeout(
          supabaseAdmin
            .from('activity_logs')
            .insert([logData]),
          3000
        );
      } catch (logErr) {
        console.warn("Failed to log activity, but resume was saved:", logErr);
      }

      res.status(200).json({ message: "Resume submitted successfully", resume });
    } catch (dbError: any) {
      console.warn("Database error (falling back to in-memory):", dbError.message);
      
      const resumeId = generateId();
      const newResume = { id: resumeId, user_id: uid, content, status: 'pending', created_at: new Date().toISOString() };
      inMemoryResumes.push(newResume);
      
      console.log(`Resume saved in-memory with ID: ${resumeId}. Total in-memory: ${inMemoryResumes.length}`);
      
      res.status(200).json({ message: "Resume submitted successfully (in-memory)", resume: newResume });
    }
  } catch (error: any) {
    console.error("Error submitting resume:", error);
    res.status(500).json({ error: error.message || "Failed to submit resume" });
  }
});

const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const pass = req.headers['x-admin-password'];
    const adminPassword = (process.env.APP_ADMIN_PASSWORD || 'admin123').trim();
    
    console.log(`[AUTH] Admin check for ${req.path}: Received header ${pass ? 'exists' : 'missing'}`);
    
    if (typeof pass === 'string' && pass.trim() === adminPassword) {
      console.log("[AUTH] Admin check: Success");
      next();
    } else {
      console.log(`[AUTH] Admin check: Unauthorized. Expected: ${adminPassword.substring(0, 2)}..., Received: ${typeof pass === 'string' ? pass.substring(0, 2) + '...' : 'none'}`);
      res.status(401).json({ error: "Unauthorized" });
    }
  } catch (e: any) {
    console.error("[AUTH] Critical error in checkAdmin middleware:", e);
    res.status(500).json({ error: "Internal server error in auth middleware" });
  }
};

app.post("/api/admin/verify", (req, res) => {
  const { password } = req.body;
  const adminPassword = (process.env.APP_ADMIN_PASSWORD || 'admin123').trim();
  console.log("Login attempt - Received:", password, "Expected:", adminPassword);
  if (typeof password === 'string' && password.trim() === adminPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// API Route for fetching resumes (Admin Dashboard)
app.get("/api/resumes", checkAdmin, async (req, res) => {
  const status = req.query.status as string;
  console.log(`Admin fetching resumes with status filter: ${status}`);
  try {
    try {
      if (!isSupabaseConfigured()) {
        console.log("Supabase not configured, using in-memory fallback");
        throw new Error("Supabase not configured");
      }
      
      console.log("Querying Supabase for resumes...");
      let query = supabaseAdmin
        .from('resumes')
        .select('id, status, created_at, content')
        .order('created_at', { ascending: false })
        .limit(100); // Increased limit slightly
        
      const { data: dbResumes, error } = await withTimeout(query, 8000);

      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }
      
      console.log(`Supabase returned ${dbResumes?.length || 0} resumes`);
      
      if (!dbResumes) {
        return res.status(200).json({ resumes: [] });
      }

      // Filter and map in JS for better reliability with JSONB
      let resumes = dbResumes.map((r: any) => {
        const content = r.content || {};
        const isRejected = content.rejected === true || content.rejected === 'true';
        return {
          id: r.id,
          status: isRejected ? 'rejected' : r.status,
          created_at: r.created_at,
          fileName: content.fileName || 'Unknown',
          rejected: isRejected
        };
      });

      console.log("Mapping complete, applying filters...");

      if (status === 'pending') {
        resumes = resumes.filter(r => r.status === 'pending' && !r.rejected);
      } else if (status === 'approved') {
        resumes = resumes.filter(r => r.status === 'approved');
      } else if (status === 'rejected') {
        resumes = resumes.filter(r => r.rejected);
      }

      console.log(`Returning ${resumes.length} resumes after filtering`);
      res.status(200).json({ resumes });
    } catch (dbError: any) {
      console.warn("Database error (falling back to in-memory):", dbError.message);
      let filtered = [...inMemoryResumes];
      if (status === 'pending') {
        filtered = filtered.filter(r => r.status === 'pending');
      } else if (status === 'approved') {
        filtered = filtered.filter(r => r.status === 'approved');
      } else if (status === 'rejected') {
        filtered = filtered.filter(r => r.status === 'rejected');
      }
      res.status(200).json({ resumes: filtered });
    }
  } catch (error: any) {
    console.error("Critical error fetching resumes:", error);
    res.status(500).json({ error: error.message || "Failed to fetch resumes" });
  }
});

// API Route for checking resume status
app.get("/api/resumes/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
      const { data: resume, error } = await withTimeout(
        supabaseAdmin
          .from('resumes')
          .select('status, content')
          .eq('id', id)
          .single(),
        8000
      );

      if (error) throw error;
      
      const currentStatus = resume.content?.rejected ? 'rejected' : resume.status;
      res.status(200).json({ 
        status: currentStatus,
        content: resume.content // Send content back so frontend can recover after refresh
      });
    } catch (dbError: any) {
      console.warn("Database error (falling back to in-memory):", dbError.message);
      const resume = inMemoryResumes.find(r => r.id === id);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.status(200).json({ 
        status: resume.status,
        content: resume.content 
      });
    }
  } catch (error: any) {
    console.error("Error checking resume status:", error);
    res.status(500).json({ error: error.message || "Failed to check resume status" });
  }
});

// API Route for approving a resume
app.post("/api/approve", checkAdmin, async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: "Resume ID is required" });
    }

    try {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
      // 1. Update status to approved and clear rejected flag
      const { data: currentResume, error: fetchError } = await withTimeout(
        supabaseAdmin
          .from('resumes')
          .select('content')
          .eq('id', resumeId)
          .single(),
        8000
      );
        
      if (fetchError) throw fetchError;

      const updatedContent = { ...currentResume.content };
      delete updatedContent.rejected;

      const { data: resume, error: updateError } = await withTimeout(
        supabaseAdmin
          .from('resumes')
          .update({ 
            status: 'approved',
            content: updatedContent
          })
          .eq('id', resumeId)
          .select()
          .single(),
        8000
      );

      if (updateError) throw updateError;

      // 2. Log the approval
      try {
        await withTimeout(
          supabaseAdmin
            .from('activity_logs')
            .insert([
              { action: 'resume_approved', details: { resume_id: resumeId, approved_by: 'admin' } }
            ]),
          3000
        );
      } catch (logErr) {}

      res.status(200).json({ message: "Resume approved successfully", resume });
    } catch (dbError: any) {
      console.warn("Database error (falling back to in-memory):", dbError.message);
      
      const resumeIndex = inMemoryResumes.findIndex(r => r.id === resumeId);
      if (resumeIndex === -1) {
        return res.status(404).json({ error: "Resume not found in memory" });
      }
      
      inMemoryResumes[resumeIndex].status = 'approved';
      res.status(200).json({ message: "Resume approved successfully (in-memory)", resume: inMemoryResumes[resumeIndex] });
    }
  } catch (error: any) {
    console.error("Error approving resume:", error);
    res.status(500).json({ error: error.message || "Failed to approve resume" });
  }
});

// API Route for rejecting a resume
app.post("/api/reject", checkAdmin, async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: "Resume ID is required" });
    }

    try {
      if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
      // 1. Fetch the current resume to get its content
      const { data: currentResume, error: fetchError } = await withTimeout(
        supabaseAdmin
          .from('resumes')
          .select('content')
          .eq('id', resumeId)
          .single(),
        8000
      );
        
      if (fetchError) throw fetchError;

      // 2. Update status by setting a flag in the content JSONB (to bypass check constraint)
      const { data: resume, error: updateError } = await withTimeout(
        supabaseAdmin
          .from('resumes')
          .update({ 
            content: { ...currentResume.content, rejected: true } 
          })
          .eq('id', resumeId)
          .select()
          .single(),
        8000
      );

      if (updateError) throw updateError;

      // 3. Log the rejection
      try {
        await withTimeout(
          supabaseAdmin
            .from('activity_logs')
            .insert([
              { action: 'resume_rejected', details: { resume_id: resumeId, rejected_by: 'admin' } }
            ]),
          3000
        );
      } catch (logErr) {}

      res.status(200).json({ message: "Resume rejected successfully", resume });
    } catch (dbError: any) {
      console.warn("Database error (falling back to in-memory):", dbError.message);
      
      const resumeIndex = inMemoryResumes.findIndex(r => r.id === resumeId);
      if (resumeIndex === -1) {
        return res.status(404).json({ error: "Resume not found in memory" });
      }
      
      inMemoryResumes[resumeIndex].status = 'rejected';
      res.status(200).json({ message: "Resume rejected successfully (in-memory)", resume: inMemoryResumes[resumeIndex] });
    }
  } catch (error: any) {
    console.error("Error rejecting resume:", error);
    res.status(500).json({ error: error.message || "Failed to reject resume" });
  }
});

// API Route for .doc extraction
app.post("/api/extract-doc", async (req, res) => {
  try {
    const { fileBase64 } = req.body;
    
    if (!fileBase64) {
      return res.status(400).json({ error: "No file data provided" });
    }

    console.log("[DOC] Extracting .doc file...");
    const buffer = Buffer.from(fileBase64, 'base64');
    
    // Dynamic import to avoid issues on Vercel startup
    const WordExtractorModule = await import("word-extractor");
    const Extractor = WordExtractorModule.default || (WordExtractorModule as any);
    
    const extractor = new Extractor();
    const extracted = await extractor.extract(buffer);
    const text = extracted.getBody();

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Could not extract text from this .doc file." });
    }

    console.log("[DOC] Extraction successful");
    res.json({ text });
  } catch (error: any) {
    console.error("Error extracting .doc:", error);
    res.status(500).json({ error: error.message || "Failed to extract text from .doc file" });
  }
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[GLOBAL ERROR] ${req.method} ${req.path}:`, err);
  
  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message,
    path: req.path,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

async function setupApp() {
  console.log("Starting server setup...");
  
  const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV || !!process.env.VERCEL_URL;
  
  if (!isVercel) {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      try {
        const viteModule = "vite";
        const { createServer: createViteServer } = await import(viteModule);
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
        console.log("Vite middleware loaded successfully");
      } catch (e) {
        console.error("Failed to load Vite middleware:", e);
      }
    } else {
      // Serve static files in production
      app.use(express.static(path.join(process.cwd(), "dist")));
      app.get("*all", (req, res) => {
        res.sendFile(path.join(process.cwd(), "dist", "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

setupApp().catch(error => {
  console.error("Failed to setup app:", error);
  process.exit(1);
});

export default app;

