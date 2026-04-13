import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing service key");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLS() {
  const { data, error } = await supabaseAdmin.rpc('get_policies', { table_name: 'resumes' });
  console.log("Policies via RPC:", data);
  console.log("Error via RPC:", error);
  
  // Try querying pg_policies directly using raw SQL if possible, but Supabase JS doesn't support raw SQL directly.
  // We can try to see if RLS is enabled on the table.
}

checkRLS();
