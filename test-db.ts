import 'dotenv/config';
import { supabaseAdmin } from "./server/supabase.js";
async function test() {
  const { data, error } = await supabaseAdmin.from('resumes').select('id').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}
test();
