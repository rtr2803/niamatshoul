import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://zchpcztyraleqpajcwdx.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjaHBjenR5cmFsZXFwYWpjd2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NTQyNzgsImV4cCI6MjEwNTMzMDI3OH0.ZiRVL0bUNzrZvP-6-WpTw-_oir1ZfcsnC6SViT63CMw';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
