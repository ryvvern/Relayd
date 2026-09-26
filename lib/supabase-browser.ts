import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Browser-safe client using the anon/public key, for use in client
// components (e.g. Realtime subscriptions). Never import lib/supabase.ts
// (the service-role client) into client-side code.
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
