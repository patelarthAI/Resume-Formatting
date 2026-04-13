import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testAnon() {
  const { data: rejected, error: errRejected } = await supabaseAnon.from('resumes').select('id, status').eq('status', 'pending').eq('content->>rejected', 'true');
  console.log("Rejected resumes count:", rejected?.length);
  console.log("Rejected error:", errRejected);
}

testAnon();
