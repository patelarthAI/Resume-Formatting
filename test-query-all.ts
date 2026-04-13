import 'dotenv/config';
import { supabaseAdmin } from "./server/supabase.js";

async function testQuery() {
  let query = supabaseAdmin
    .from('resumes')
    .select('id, status, created_at, content->fileName, content->rejected, content->auto_rejected')
    .order('created_at', { ascending: false });
    
  const { data, error } = await query;
  console.log("Error:", error);
  console.log("Count:", data?.length);
  
  if (data) {
    const size = JSON.stringify(data).length;
    console.log("JSON size:", size);
  }
}

testQuery();
