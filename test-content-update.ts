import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aslhnupdyshgydjgcwtw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbGhudXBkeXNoZ3lkamdjd3R3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ1OTExNSwiZXhwIjoyMDg5MDM1MTE1fQ.6WFLq4H7sUUKKrtEFaPpekslbi7fxIo7NVdzFIHm4-8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testContentUpdate() {
  const { data: insertData, error: insertError } = await supabase
    .from('resumes')
    .insert([{ content: { test: true }, status: 'pending' }])
    .select()
    .single();
    
  if (insertError) {
    console.log(`Insert failed: ${insertError.message}`);
    return;
  }
  
  console.log(`Insert SUCCEEDED! ID: ${insertData.id}`);
  
  const { data: updateData, error: updateError } = await supabase
    .from('resumes')
    .update({ content: { ...insertData.content, rejected: true } })
    .eq('id', insertData.id)
    .select()
    .single();
    
  if (updateError) {
    console.log(`Update failed: ${updateError.message}`);
  } else {
    console.log(`Update SUCCEEDED! Content: ${JSON.stringify(updateData.content)}`);
  }
  
  // Clean up
  await supabase.from('resumes').delete().eq('id', insertData.id);
}

testContentUpdate();
