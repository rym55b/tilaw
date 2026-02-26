import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Star, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function Session() {
  const { id } = useParams<{ id: string }>();
  const { t, dir } = useI18n();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  // WebRTC voice connection
  const { connected, remoteIsSpeaking, muted, toggleMute, cleanup: cleanupWebRTC } = useWebRTC({
    sessionId: id || '',
    localUserId: profile?.id || '',
    remoteUserId: partner?.id || '',
    enabled: !!session && !!partner && !showRating,
  });
  // Timer
  useEffect(() => {
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!id || !profile) return;

    const fetchSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*, user1:profiles!sessions_user1_id_fkey(*), user2:profiles!sessions_user2_id_fkey(*)')
        .eq('id', id)
        .single();
      if (data) {
        setSession(data);
        setPartner(data.user1_id === profile.id ? data.user2 : data.user1);
      }
    };
    fetchSession();
  }, [id, profile]);

  const endSession = async () => {
    if (!id) return;
    await supabase
      .from('sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', id);
    cleanupWebRTC();
    setShowRating(true);
  };

  const submitRating = async () => {
    if (!profile || !partner || !id) return;
    await supabase.from('ratings').insert({
      session_id: id,
      rater_id: profile.id,
      rated_id: partner.id,
      stars,
      comment: comment || null,
    });
    toast({ title: t('ratePartner'), description: 'شكراً لتقييمك!' });
    navigate('/dashboard');
  };

  if (!session || !partner) {
    return (
      <div dir={dir} className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showRating) {
    return (
      <div dir={dir} className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <Card className="w-full max-w-md border-border/50">
            <CardContent className="p-6 space-y-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">{t('ratePartner')}</h2>
              <p className="text-muted-foreground">{partner.display_name}</p>

              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setStars(s)}>
                    <Star className={`h-10 w-10 transition-colors ${s <= stars ? 'text-gold fill-current' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>

              <Textarea
                placeholder={t('comment')}
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="resize-none"
              />

              <Button onClick={submitRating} className="w-full gradient-emerald border-0 text-primary-foreground">
                {t('submit')}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-8 px-4">
        {/* Timer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-3xl font-mono text-foreground"
        >
          <Clock className="h-6 w-6 text-muted-foreground" />
          {formatTime(elapsed)}
        </motion.div>

        {/* Partner Info */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className={`flex h-24 w-24 items-center justify-center rounded-full ${remoteIsSpeaking ? 'ring-4 ring-primary/50 animate-pulse' : ''} bg-primary/10`}>
              <span className="text-3xl font-bold text-primary">{partner.display_name[0]}</span>
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-foreground">{partner.display_name}</h3>
            <p className="text-xs text-muted-foreground">
              {connected ? '🟢 متصل' : '🔴 جارٍ الاتصال...'}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-gold fill-current" />
              {Number(partner.average_rating).toFixed(1)}
            </div>
          </div>
        </motion.div>

        {/* Session type badge */}
        <div className="rounded-full bg-primary/10 px-4 py-1 text-sm text-primary font-medium">
          {session.session_type === 'recitation' ? t('recitation') : session.session_type === 'memorization' ? t('memorization') : t('tests')}
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          <Button
            size="lg"
            variant={muted ? 'destructive' : 'outline'}
            className="h-16 w-16 rounded-full"
            onClick={toggleMute}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <Button
            size="lg"
            variant="destructive"
            className="h-16 w-16 rounded-full"
            onClick={endSession}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {muted ? t('mute') : t('unmute')}
        </p>
        <audio id="remote-audio" autoPlay playsInline />
      </main>
    </div>
  );
}
