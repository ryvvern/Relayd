import { supabase } from "../lib/supabase";

async function main() {
  // Auth admin API requires no application tables to exist; a successful
  // response (even an empty list) confirms the URL and service-role key work.
  const { error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  if (error) {
    throw error;
  }

  console.log("✅ Supabase connection succeeded.");
}

main().catch((error) => {
  console.error("❌ Supabase connection failed:");
  console.error(error);
  process.exit(1);
});
