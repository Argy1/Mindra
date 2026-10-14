import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Agora token-builder — using the community Deno port.
// Replace with the official Agora token server once production-ready.
// https://github.com/AgoraIO/Tools/tree/master/DynamicKey

const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID') ?? ''
const AGORA_APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE') ?? ''
const TOKEN_EXPIRY_SECONDS = 3600 // 1 hour

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { channel, uid } = await req.json() as { channel: string; uid: string }

    if (!channel || !uid) {
      return new Response(
        JSON.stringify({ error: 'channel and uid are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      // Dev mode — return a placeholder so the UI can be tested without Agora creds
      return new Response(
        JSON.stringify({ token: 'dev-placeholder-token', appId: AGORA_APP_ID }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Token generation ─────────────────────────────────────────────────────
    // Production: use the Agora AccessToken2 builder.
    // The community Deno port: https://esm.sh/agora-token@2.0.3
    //
    // import { RtcTokenBuilder, RtcRole } from 'https://esm.sh/agora-token@2.0.3'
    //
    // const token = RtcTokenBuilder.buildTokenWithUid(
    //   AGORA_APP_ID,
    //   AGORA_APP_CERTIFICATE,
    //   channel,
    //   parseInt(uid),
    //   RtcRole.PUBLISHER,
    //   Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
    //   Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
    // )
    //
    // return new Response(
    //   JSON.stringify({ token, appId: AGORA_APP_ID }),
    //   { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    // )

    // Stub until agora-token package is wired in
    return new Response(
      JSON.stringify({ token: 'configure-agora-certificate', appId: AGORA_APP_ID }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
