import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Stats() {
  const { t, dir } = useI18n();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const [sesRes, ratRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, user1:profiles!sessions_user1_id_fkey(display_name), user2:profiles!sessions_user2_id_fkey(display_name)')
          .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
          .eq('status', 'completed')
          .order('ended_at', { ascending: false })
          .limit(20),
        supabase
          .from('ratings')
          .select('*')
          .eq('rated_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setSessions(sesRes.data || []);
      setRatings(ratRes.data || []);
    };
    fetch();
  }, [profile]);

  if (!profile) return null;

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-2 gap-2">
          <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('home')}
        </Button>

        <h2 className="text-2xl font-bold text-foreground">{t('statistics')}</h2>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Clock className="mx-auto h-6 w-6 text-primary mb-1" />
              <div className="text-2xl font-bold text-foreground">{profile.total_sessions}</div>
              <p className="text-xs text-muted-foreground">{t('completedSessions')}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <Star className="mx-auto h-6 w-6 text-gold mb-1" />
              <div className="text-2xl font-bold text-foreground">{Number(profile.average_rating).toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">{t('averageRating')}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <TrendingUp className="mx-auto h-6 w-6 text-emerald mb-1" />
              <div className="text-2xl font-bold text-foreground">{ratings.length}</div>
              <p className="text-xs text-muted-foreground">{t('rating')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Session History */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">{t('sessions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noResults')}</p>
            ) : (
              sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {s.user1_id === profile.id ? s.user2?.display_name : s.user1?.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.session_type} • {new Date(s.ended_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
