import { createClient } from '@supabase/supabase-js';

async function check() {
    try {
        const supabaseUrl = 'https://fafisurbnecapdpguudb.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZmlzdXJibmVjYXBkcGd1dWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzY1ODUsImV4cCI6MjA4ODc1MjU4NX0.5oNxGkTGfOPk8FZV3bIT2wFzsu5KMiys1lGUH8gzJgk';

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        const email = `temp_saver_${Math.random()}@example.com`;
        const { data: signUp, error: signError } = await supabase.auth.signUp({
            email,
            password: 'PassWord123!'
        });
        
        if (signError) {
            console.log("Sign up error:", signError.message);
            return;
        }
        
        const userId = signUp.user.id;
        
        // Attempt to insert a workout with a LONG string in the "dia" column.
        console.log("Attempting insertion...");
        const { data, error } = await supabase
            .from('tbTreinosCompletos')
            .insert({
                user_id: userId,
                dia: 'A - PEITO E BÍCEPS E TRÍCEPS',
                duracao_segundos: 120,
                concluido_em: new Date().toISOString()
            })
            .select();
            
        if (error) {
            console.error("Insertion error:", error.message, error.details);
        } else {
            console.log("SUCCESS! Inserted row:", data);
        }
        
        // Clean up after ourselves if possible.
        if (data?.[0]?.id) {
             await supabase.from('tbTreinosCompletos').delete().eq('id', data[0].id);
        }

    } catch (e) {
        console.error(e);
    }
}
check();
