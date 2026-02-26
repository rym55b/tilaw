import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { userId, sessionType, gender } = await req.json();
    console.log('Matchmaking request:', { userId, sessionType, gender });

    // Find other users in the queue with same session type
    const { data: queueEntries, error: queueError } = await supabase
      .from('matchmaking_queue')
      .select('user_id, profiles!inner(id, gender)')
      .eq('session_type', sessionType)
      .neq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(10);

    if (queueError) {
      console.error('Queue query error:', queueError);
      throw queueError;
    }

    console.log('Queue entries found:', queueEntries?.length, JSON.stringify(queueEntries));

    // Try same-gender match first, then fallback to any match
    let match = queueEntries?.find((entry: any) => entry.profiles?.gender === gender);
    if (!match && queueEntries && queueEntries.length > 0) {
      console.log('No same-gender match, using first available');
      match = queueEntries[0];
    }

    if (match) {
      console.log('Match found:', match.user_id);

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          session_type: sessionType,
          user1_id: userId,
          user2_id: match.user_id,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }

      console.log('Session created:', session?.id);

      // Remove both from queue
      await supabase.from('matchmaking_queue').delete().in('user_id', [userId, match.user_id]);

      return new Response(JSON.stringify({ sessionId: session?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('No match found, user stays in queue');
    return new Response(JSON.stringify({ sessionId: null, message: 'No match found yet' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Matchmaking error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
