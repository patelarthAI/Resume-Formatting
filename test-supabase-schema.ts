import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  try {
    const { data, error } = await supabase.from('resumes').select('*').limit(1);
    if (error) {
      console.error("Supabase Error:", error);
    } else {
      console.log("Supabase Success, columns:", Object.keys(data[0] || {}));
    }
  } catch (e) {
    console.error("Critical Error:", e);
  }
}

test();
