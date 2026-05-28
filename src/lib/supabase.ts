import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://fafisurbnecapdpguudb.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZmlzdXJibmVjYXBkcGd1dWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzY1ODUsImV4cCI6MjA4ODc1MjU4NX0.5oNxGkTGfOPk8FZV3bIT2wFzsu5KMiys1lGUH8gzJgk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
