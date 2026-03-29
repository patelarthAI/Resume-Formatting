import 'dotenv/config';
import express from "express";
import crypto from "crypto";
console.log("Server starting...");
import WordExtractor from "word-extractor";
// Fallback for some environments
const Extractor = (WordExtractor as any).default || WordExtractor;
import multer from "multer";
import path from "path";

const upload = multer({ storage: multer.memoryStorage() });

import { supabaseAdmin } from "./server/supabase.js";

const app = express();
const PORT = 3000;

async function setupApp() {
  console.log("Starting server setup...");
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  console.log("Express JSON middleware loaded with 50mb limit");

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      hasApiKey: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)
    });
  });

  // In-memory fallback for testing without a database
  const inMemoryResumes: any[] = [];

  // Helper to check if Supabase is actually configured
  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    return url && !url.includes('placeholder');
  };

  // Background task to clean up old pending resumes
  const autoRejectOldResumes = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: oldResumes, error: fetchError } = await supabaseAdmin
        .from('resumes')
        .select('id, content')
        .eq('status', 'pending')
        .is('content->>rejected', null)
        .lt('created_at', twoMinutesAgo);
        
      if (fetchError) throw fetchError;
      
      if (oldResumes && oldResumes.length > 0) {
        console.log(`Auto-rejecting ${oldResumes.length} old resumes...`);
        for (const r of oldResumes) {
          const updatedContent = { ...(r.content || {}), rejected: true, auto_rejected: true };
          await supabaseAdmin
            .from('resumes')
            .update({ content: updatedContent })
            .eq('id', r.id);
            
          await supabaseAdmin
            .from('activity_logs')
            .insert([{ action: 'resume_auto_rejected', details: { resume_id: r.id } }]);
        }
      }
    } catch (err) {
      console.error("Error auto-rejecting resumes:", err);
    }
  };

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
        
        // 1. Save resume as pending
        const insertData: any = { content, status: 'pending' };
        if (uid) insertData.user_id = uid;

        const { data: resume, error: resumeError } = await supabaseAdmin
          .from('resumes')
          .insert([insertData])
          .select()
          .single();

        if (resumeError) throw resumeError;

        // 2. Log the action
        const logData: any = { action: 'resume_submitted', details: { resume_id: resume.id } };
        if (uid) logData.user_id = uid;

        await supabaseAdmin
          .from('activity_logs')
          .insert([logData]);

        res.status(200).json({ message: "Resume submitted successfully", resume });
      } catch (dbError: any) {
        console.warn("Database error (falling back to in-memory):", dbError.message);
        
        const resumeId = crypto.randomUUID();
        const newResume = { id: resumeId, user_id: uid, content, status: 'pending', created_at: new Date().toISOString() };
        inMemoryResumes.push(newResume);
        
        res.status(200).json({ message: "Resume submitted successfully (in-memory)", resume: newResume });
      }
    } catch (error: any) {
      console.error("Error submitting resume:", error);
      res.status(500).json({ error: error.message || "Failed to submit resume" });
    }
  });

  const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const pass = req.headers['x-admin-password'];
    const adminPassword = (process.env.APP_ADMIN_PASSWORD || 'admin123').trim();
    if (typeof pass === 'string' && pass.trim() === adminPassword) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
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
    try {
      const { status } = req.query;
      
      try {
        if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
        
        let query = supabaseAdmin
          .from('resumes')
          .select('id, status, created_at, content->fileName, content->rejected, content->auto_rejected')
          .order('created_at', { ascending: false });
          
        if (status === 'pending') {
          query = query.eq('status', 'pending').is('content->>rejected', null);
        } else if (status === 'approved') {
          query = query.eq('status', 'approved');
        } else if (status === 'rejected') {
          query = query.eq('status', 'pending').eq('content->>rejected', 'true');
        }
          
        const { data: dbResumes, error } = await query;

        if (error) throw error;
        
        // Map the status for the frontend
        let resumes = dbResumes.map(r => {
          let currentStatus = (r.rejected || r.content?.rejected) ? 'rejected' : r.status;
          return {
            ...r,
            status: currentStatus
          };
        });

        // Re-filter in memory to account for lazy rejections
        if (status && typeof status === 'string') {
          resumes = resumes.filter(r => r.status === status);
        }

        res.status(200).json({ resumes });
      } catch (dbError: any) {
        console.warn("Database error (falling back to in-memory):", dbError.message);
        
        let filtered = inMemoryResumes;
        if (status && typeof status === 'string') {
          filtered = filtered.filter(r => r.status === status);
        }
        res.status(200).json({ resumes: filtered });
      }
    } catch (error: any) {
      console.error("Error fetching resumes:", error);
      res.status(500).json({ error: error.message || "Failed to fetch resumes" });
    }
  });

  // API Route for checking resume status
  app.get("/api/resumes/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      
      try {
        if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
        const { data: resume, error } = await supabaseAdmin
          .from('resumes')
          .select('id, status, content, created_at')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        let currentStatus = resume.content?.rejected ? 'rejected' : resume.status;

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
        // 1. Update status to approved
        const { data: resume, error: updateError } = await supabaseAdmin
          .from('resumes')
          .update({ status: 'approved' })
          .eq('id', resumeId)
          .select()
          .single();

        if (updateError) throw updateError;

        // 2. Log the approval
        await supabaseAdmin
          .from('activity_logs')
          .insert([
            { action: 'resume_approved', details: { resume_id: resumeId, approved_by: 'admin' } }
          ]);

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
        const { data: currentResume, error: fetchError } = await supabaseAdmin
          .from('resumes')
          .select('content')
          .eq('id', resumeId)
          .single();
          
        if (fetchError) throw fetchError;

        // 2. Update status by setting a flag in the content JSONB (to bypass check constraint)
        const { data: resume, error: updateError } = await supabaseAdmin
          .from('resumes')
          .update({ 
            content: { ...currentResume.content, rejected: true } 
          })
          .eq('id', resumeId)
          .select()
          .single();

        if (updateError) throw updateError;

        // 3. Log the rejection
        await supabaseAdmin
          .from('activity_logs')
          .insert([
            { action: 'resume_rejected', details: { resume_id: resumeId, rejected_by: 'admin' } }
          ]);

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

      const buffer = Buffer.from(fileBase64, 'base64');
      const extractor = new Extractor();
      const extracted = await extractor.extract(buffer);
      const text = extracted.getBody();

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: "Could not extract text from this .doc file." });
      }

      res.json({ text });
    } catch (error: any) {
      console.error("Error extracting .doc:", error);
      res.status(500).json({ error: error.message || "Failed to extract text from .doc file" });
    }
  });

  if (!process.env.VERCEL) {
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

