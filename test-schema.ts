import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aslhnupdyshgydjgcwtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbGhudXBkeXNoZ3lkamdjd3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTkxMTUsImV4cCI6MjA4OTAzNTExNX0.E7At6bW0iMgHZJ-F2QI9L0cbU31TyofUwFcD_KNpCpI';

async function fetchSchema() {
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
  const json = await res.json();
  console.log(JSON.stringify(json.definitions.resumes, null, 2));
}

fetchSchema();
