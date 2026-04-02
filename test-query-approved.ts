import 'dotenv/config';
import { supabaseAdmin } from "./server/supabase.js";
async function test() {
  const { data, error } = await supabaseAdmin.from('resumes').select('id, status').eq('status', 'approved');
  console.log("Approved Resumes:", data?.length);
  const { data: all, error: err2 } = await supabaseAdmin.from('resumes').select('id, status');
  console.log("All Resumes:", all?.length);
  console.log("Statuses:", all?.map(r => r.status));
}
test();
