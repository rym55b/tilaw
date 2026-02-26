import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';
import { IslamicPattern } from '@/components/IslamicPattern';
import { Button } from '@/components/ui/button';

export default function Matchmaking() {
  const { t, dir } = useI18n();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionType = searchParams.get('type') || 'recitation';
  const [_searching, setSearching] = useState(false);
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(iv);
  }, []);

  const joinQueue = useCallback(async () => {
    if (!profile) return;
    setSearching(true);

    // Insert into queue
    await supabase.from('matchmaking_queue').upsert({
      user_id: profile.id,
      session_type: sessionType as any,
    });

    // Call edge function to attempt match
    const { data } = await supabase.functions.invoke('matchmaking', {
      body: { userId: profile.id, sessionType, gender: profile.gender },
    });

    if (data?.sessionId) {
      navigate(`/session/${data.sessionId}`);
    }
  }, [profile, sessionType, navigate]);

  useEffect(() => {
    joinQueue();

    // Poll for match every 5 seconds
    const interval = setInterval(async () => {
      if (!profile) return;
      const { data } = await supabase
        .from('sessions')
        .select('id')
        .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (data) {
        navigate(`/session/${data.id}`);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      // Remove from queue on leave
      if (profile) {
        supabase.from('matchmaking_queue').delete().eq('user_id', profile.id);
      }
    };
  }, [profile, joinQueue, navigate]);

  const leaveQueue = async () => {
    if (profile) {
      await supabase.from('matchmaking_queue').delete().eq('user_id', profile.id);
    }
    navigate('/dashboard');
  };

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <Navbar />
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <IslamicPattern className="text-foreground" opacity={0.03} />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex flex-col items-center gap-8 text-center"
        >
          {/* Animated circles */}
          <div className="relative h-40 w-40">
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-primary/20"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              className="absolute inset-4 rounded-full bg-primary/30"
            />
            <div className="absolute inset-8 flex items-center justify-center rounded-full gradient-emerald shadow-lg">
              <span className="text-4xl font-bold text-primary-foreground font-serif">ت</span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">{t('waiting')}{dots}</h2>
            <p className="mt-2 text-muted-foreground">
              {sessionType === 'recitation' ? t('recitation') : sessionType === 'memorization' ? t('memorization') : t('tests')}
            </p>
          </div>

          <Button variant="outline" onClick={leaveQueue} className="px-8">
            {t('cancel')}
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
