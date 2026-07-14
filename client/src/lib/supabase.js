import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // CRITICAL: Do NOT use localStorage (violates NFR-A4).
        // The server manages sessions via httpOnly cookies.
        // The client SDK's auth methods (signIn, signUp, signOut) will call
        // our server proxy endpoints, not Supabase directly.
        // We disable the built-in storage to prevent accidental localStorage usage.
        storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
        },
        autoRefreshToken: false,  // Server handles refresh via httpOnly cookie
        persistSession: false,    // Server manages session persistence
        detectSessionInUrl: false,
    },
});