import 'dotenv/config';
import { supabaseAdmin } from "./server/supabase.js";

async function test() {
  const { data, error } = await supabaseAdmin
    .from('resumes')
    .select('id, status, created_at, content->fileName, content->rejected, content->auto_rejected')
    .eq('status', 'approved')
    .limit(2);
    
  console.log("Data:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

test();
