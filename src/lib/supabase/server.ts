import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(items: {name:string;value:string;options:CookieOptions}[]) {
        // Server Components cannot set cookies. Middleware refreshes sessions.
        try {
          items.forEach(({name,value,options})=>cookieStore.set(name,value,options));
        } catch {
          // Expected when called from a Server Component.
        }
      }
    }
  });
}
