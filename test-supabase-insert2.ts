import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log("Testing Supabase insert without user_id...");
  const { data, error } = await supabaseAdmin.from('resumes').insert([
    { content: { text: 'test' }, status: 'pending' }
  ]).select().single();
  
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Supabase Success:", data);
  }
}

test();
