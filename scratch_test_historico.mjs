import { createClient } from '@supabase/supabase-js';

async function check() {
    try {
        const supabaseUrl = 'https://fafisurbnecapdpguudb.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZmlzdXJibmVjYXBkcGd1dWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzY1ODUsImV4cCI6MjA4ODc1MjU4NX0.5oNxGkTGfOPk8FZV3bIT2wFzsu5KMiys1lGUH8gzJgk';

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        const { data, error } = await supabase
            .from('tbHistorico')
            .select(`
                id,
                dia,
                tbExercicios ( grupo )
            `)
            .limit(5);
        if (error) {
            console.error("Error querying tbHistorico:", error);
        } else {
            console.log("Results from tbHistorico:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}
check();
