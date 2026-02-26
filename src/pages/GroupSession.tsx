import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Star, Clock, Hand, Copy, Users, Crown, VolumeX, Share2, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useGroupWebRTC } from '@/hooks/useGroupWebRTC';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function GroupSession() {
  const { id } = useParams<{ id: string }>();
  const { t, dir } = useI18n();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  const isCreator = session?.creator_id === profile?.id;

  const { connected, muted, toggleMute, speakingPeers, cleanup: cleanupWebRTC } = useGroupWebRTC({
    sessionId: id || '',
    localUserId: profile?.id || '',
    participantIds: participants.filter(p => p.user_id !== profile?.id && !p.left_at).map(p => p.user_id),
    enabled: !!session && !!profile && !showRating,
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

  // Fetch session and participants
  useEffect(() => {
    if (!id || !profile) return;

    const fetchSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setSession(data);
    };

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('session_participants')
        .select('*, profile:profiles!session_participants_user_id_fkey(id, display_name, average_rating, gender)')
        .eq('session_id', id);
      if (data) setParticipants(data);
    };

    fetchSession();
    fetchParticipants();

    // Realtime participants
    const channel = supabase
      .channel(`group-session-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants', filter: `session_id=eq.${id}` }, () => {
        fetchParticipants();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, profile]);

  const toggleHand = async () => {
    if (!id || !profile) return;
    const newState = !handRaised;
    setHandRaised(newState);
    await supabase
      .from('session_participants')
      .update({ hand_raised: newState })
      .eq('session_id', id)
      .eq('user_id', profile.id);
  };

  const muteParticipant = async (userId: string) => {
    if (!isCreator || !id) return;
    await supabase
      .from('session_participants')
      .update({ is_muted_by_host: true })
      .eq('session_id', id)
      .eq('user_id', userId);
  };

  const endSession = async () => {
    if (!id) return;
    await supabase
      .from('sessions')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', id);
    cleanupWebRTC();
    setShowRating(true);
  };

  const leaveSession = async () => {
    if (!id || !profile) return;
    await supabase
      .from('session_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('session_id', id)
      .eq('user_id', profile.id);
    cleanupWebRTC();
    navigate('/dashboard');
  };

  const copyAccessCode = () => {
    if (session?.access_code) {
      navigator.clipboard.writeText(session.access_code);
      toast({ title: 'تم النسخ', description: 'تم نسخ رمز الدخول' });
    }
  };

  const sessionLink = `${window.location.origin}/group-session/${id}`;

  const copySessionLink = () => {
    navigator.clipboard.writeText(sessionLink);
    toast({ title: t('linkCopied'), description: sessionLink });
  };

  const shareViaWhatsApp = () => {
    const text = `${session?.title || t('groupSession')}\n${t('joinSession')}: ${sessionLink}${session?.access_code ? `\n${t('accessCode')}: ${session.access_code}` : ''}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const submitRating = async () => {
    toast({ title: t('ratePartner'), description: 'شكراً لتقييمك!' });
    navigate('/dashboard');
  };

  if (!session || !profile) {
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
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setStars(s)}>
                    <Star className={`h-10 w-10 transition-colors ${s <= stars ? 'text-gold fill-current' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
              <Textarea placeholder={t('comment')} value={comment} onChange={e => setComment(e.target.value)} className="resize-none" />
              <Button onClick={submitRating} className="w-full gradient-emerald border-0 text-primary-foreground">{t('submit')}</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const activeParticipants = participants.filter(p => !p.left_at);

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{session.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatTime(elapsed)}</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {activeParticipants.length}</span>
              <Badge variant="secondary">
                {session.session_type === 'recitation' ? t('recitation') : session.session_type === 'memorization' ? t('memorization') : t('tests')}
              </Badge>
              {session.is_public ? (
                <Badge variant="outline" className="text-primary border-primary/30">🔓 {t('publicSession')}</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">🔒 {t('privateSession')}</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {connected ? '🟢 متصل' : '🔴 جارٍ الاتصال...'}
          </div>
        </motion.div>

        {/* Share & Access Code */}
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-2">
            {!session.is_public && session.access_code && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('accessCode')}: <strong className="text-foreground font-mono">{session.access_code}</strong></span>
                <Button size="sm" variant="ghost" onClick={copyAccessCode}><Copy className="h-4 w-4" /></Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1 flex-1" onClick={copySessionLink}>
                <Link className="h-4 w-4" /> {t('copyLink')}
              </Button>
              <Button size="sm" variant="outline" className="gap-1 flex-1 text-green-600 border-green-600/30 hover:bg-green-600/10" onClick={shareViaWhatsApp}>
                <Share2 className="h-4 w-4" /> {t('shareViaWhatsApp')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Participants Grid */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> {t('participants')} ({activeParticipants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {activeParticipants.map(p => {
                const isSpeaking = speakingPeers.has(p.user_id);
                const isMe = p.user_id === profile.id;
                const isHost = p.user_id === session.creator_id;

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                      isSpeaking ? 'border-primary/50 bg-primary/5 shadow-md' : 'border-border/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
                      isSpeaking ? 'ring-3 ring-primary/40 animate-pulse' : ''
                    } bg-primary/10`}>
                      <span className="text-xl font-bold text-primary">
                        {p.profile?.display_name?.[0] || '؟'}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground flex items-center gap-1">
                        {isHost && <Crown className="h-3 w-3 text-gold" />}
                        {p.profile?.display_name}
                        {isMe && <span className="text-xs text-muted-foreground">(أنا)</span>}
                      </p>
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-gold fill-current" />
                        {Number(p.profile?.average_rating || 0).toFixed(1)}
                      </div>
                    </div>

                    {/* Hand raised indicator */}
                    {p.hand_raised && (
                      <div className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full p-1">
                        <Hand className="h-3 w-3" />
                      </div>
                    )}

                    {/* Muted by host indicator */}
                    {p.is_muted_by_host && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0">مكتوم</Badge>
                    )}

                    {/* Host: mute button */}
                    {isCreator && !isMe && (
                      <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => muteParticipant(p.user_id)}>
                        <VolumeX className="h-3 w-3" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            variant={muted ? 'destructive' : 'outline'}
            className="h-14 w-14 rounded-full"
            onClick={toggleMute}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          <Button
            size="lg"
            variant={handRaised ? 'default' : 'outline'}
            className={`h-14 w-14 rounded-full ${handRaised ? 'gradient-emerald border-0 text-primary-foreground' : ''}`}
            onClick={toggleHand}
          >
            <Hand className="h-6 w-6" />
          </Button>

          {isCreator ? (
            <Button size="lg" variant="destructive" className="h-14 w-14 rounded-full" onClick={endSession}>
              <PhoneOff className="h-6 w-6" />
            </Button>
          ) : (
            <Button size="lg" variant="destructive" className="h-14 w-14 rounded-full" onClick={leaveSession}>
              <PhoneOff className="h-6 w-6" />
            </Button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {muted ? t('mute') : t('unmute')} | {handRaised ? t('lowerHand') : t('raiseHand')}
        </p>

        <audio id="remote-audio" autoPlay playsInline />
      </main>
    </div>
  );
}
