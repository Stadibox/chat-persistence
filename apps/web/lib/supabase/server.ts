import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

// Cliente Supabase para Server Components / Route Handlers / Server Actions.
// Lee y escribe la cookie de sesión vía next/headers.
export async function getSupabaseServer(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno",
    );
  }
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet: CookieToSet[]) => {
        for (const { name, value, options } of toSet) {
          try {
            store.set(name, value, options);
          } catch {
            // En render-only contexts (RSC) no se permite setear cookies; ok.
          }
        }
      },
    },
  });
}
