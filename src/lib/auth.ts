import { supabase } from './supabase';

/**
 * Centralized auth helper.
 * Returns the current user's ID for database operations.
 * Uses Supabase Auth session — falls back to 'anon' if not logged in.
 */
export function getCurrentUserId(): string {
    // Synchronous check using the cached session from Supabase's auth store.
    // supabase-js stores the session in memory after the first getSession() call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (supabase.auth as any)._getSession?.() ?? null;
    
    // Fallback: try the synchronous internal store
    try {
        const storageKey = `sb-fafisurbnecapdpguudb-auth-token`;
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            const userId = parsed?.user?.id;
            if (userId) return userId;
        }
    } catch {
        // ignore parse errors
    }

    if (session?.user?.id) return session.user.id;

    return 'anon';
}

/**
 * Async version — preferred when you can await.
 */
export async function getCurrentUserIdAsync(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? 'anon';
}
