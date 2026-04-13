import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function checkContent() {
  const { data, error } = await supabaseAnon.from('resumes').select('id, content').limit(1);
  if (data && data.length > 0) {
    const contentStr = JSON.stringify(data[0].content);
    console.log("Content length:", contentStr.length);
  }
}

checkContent();
