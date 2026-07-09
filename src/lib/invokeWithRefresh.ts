import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function; if it returns 401 (stale token, e.g. after a
 * password reset revoked prior sessions), call refreshSession() once and retry.
 */
export async function invokeWithRefresh<T = any>(
  functionName: string,
  options: { body?: any } = {},
): Promise<{ data: T | null; error: any }> {
  const first = await supabase.functions.invoke<T>(functionName, options);
  const status = (first.error as any)?.context?.status ?? (first.error as any)?.status;
  const message = String((first.error as any)?.message ?? "");
  const looks401 =
    status === 401 || /401|unauthor/i.test(message);

  if (!first.error || !looks401) return first;

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) return first;

  return await supabase.functions.invoke<T>(functionName, options);
}
