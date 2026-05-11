import { createClient } from '@supabase/supabase-js';

async function check() {
    try {
        const supabaseUrl = 'https://fafisurbnecapdpguudb.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZmlzdXJibmVjYXBkcGd1dWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzY1ODUsImV4cCI6MjA4ODc1MjU4NX0.5oNxGkTGfOPk8FZV3bIT2wFzsu5KMiys1lGUH8gzJgk';

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Try to log in with a demo user OR sign up a new one to get a token.
        const email = `temp_test_${Math.random()}@example.com`;
        const { data: signUp, error: signError } = await supabase.auth.signUp({
            email,
            password: 'StrongPassword123!'
        });
        
        if (signError) {
            console.log("Sign up error:", signError.message);
            return;
        }
        
        console.log("Logged in as authenticated user.");
        
        // Now try to read tbTreinos
        const { data, error } = await supabase
            .from('tbTreinos')
            .select(`ficha_id, dia, tbExercicios(grupo)`)
            .limit(5);
            
        if (error) {
            console.error("Query error:", error);
        } else {
            console.log("Results from authenticated user:", data);
        }
        
    } catch (e) {
        console.error(e);
    }
}
check();
