import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      waitlist: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          full_name: string;
          company: string | null;
          role: string | null;
          created_at: string;
          notified: boolean;
          position: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          full_name: string;
          company?: string;
          role?: string;
          created_at?: string;
          notified?: boolean;
          position?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          full_name?: string;
          company?: string;
          role?: string;
          created_at?: string;
          notified?: boolean;
          position?: number;
        };
      };
    };
  };
};
