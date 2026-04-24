const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fafisurbnecapdpguudb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZmlzdXJibmVjYXBkcGd1dWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzY1ODUsImV4cCI6MjA4ODc1MjU4NX0.5oNxGkTGfOPk8FZV3bIT2wFzsu5KMiys1lGUH8gzJgk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.rpc('delete_user');
  console.log("error:", error);
  const { data: d2, error: e2 } = await supabase.rpc('delete_account');
  console.log("error2:", e2);
}

check();
