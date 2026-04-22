const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fafisurbnecapdpguudb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZmlzdXJibmVjYXBkcGd1dWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzY1ODUsImV4cCI6MjA4ODc1MjU4NX0.5oNxGkTGfOPk8FZV3bIT2wFzsu5KMiys1lGUH8gzJgk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.from('tbFitPoints').select('*').limit(1);
  console.log(JSON.stringify(data, null, 2));
  console.error(error);
}

main();
