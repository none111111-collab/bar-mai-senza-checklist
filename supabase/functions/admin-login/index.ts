// Riceve il codice a 4 cifre del titolare e, se corretto, restituisce una
// sessione valida (access/refresh token). La vera password dell'account
// Supabase Auth resta solo qui, come secret della funzione: non viene mai
// spedita al browser, a differenza di prima quando stava scritta in chiaro
// dentro admin.js (visibile a chiunque nel repo pubblico).
import { createClient } from "jsr:@supabase/supabase-js@2";

const OWNER_CODES = (Deno.env.get("OWNER_CODES") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ?? "";
const OWNER_PASSWORD = Deno.env.get("OWNER_PASSWORD") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let code = "";
  try {
    ({ code } = await req.json());
  } catch {
    return Response.json({ error: "Richiesta non valida" }, { status: 400, headers: corsHeaders });
  }

  if (!code || !OWNER_CODES.includes(String(code).trim())) {
    return Response.json({ error: "Codice non riconosciuto" }, { status: 401, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  });

  if (error || !data.session) {
    return Response.json({ error: "Errore interno di accesso" }, { status: 500, headers: corsHeaders });
  }

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  }, { headers: corsHeaders });
});
