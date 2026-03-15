import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aslhnupdyshgydjgcwtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbGhudXBkeXNoZ3lkamdjd3R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ1OTExNSwiZXhwIjoyMDg5MDM1MTE1fQ.6WFLq4H7sUUKKrtEFaPpekslbi7fxIo7NVdzFIHm4-8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStatuses() {
  const statusesToTest = ['deleted', 'archived', 'done', 'finished', 'closed', 'reviewed'];
  
  for (const status of statusesToTest) {
    const { data, error } = await supabase
      .from('resumes')
      .insert([{ content: { test: true }, status }])
      .select();
      
    if (error) {
      console.log(`Status '${status}' failed: ${error.message}`);
    } else {
      console.log(`Status '${status}' SUCCEEDED!`);
      // Clean up
      if (data && data.length > 0) {
        await supabase.from('resumes').delete().eq('id', data[0].id);
      }
    }
  }
}

testStatuses();
