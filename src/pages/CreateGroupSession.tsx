import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Globe, BookOpen, Users, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function CreateGroupSession() {
  const { t, dir } = useI18n();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [sessionType, setSessionType] = useState<'recitation' | 'memorization' | 'test'>('recitation');
  const [loading, setLoading] = useState(false);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreate = async () => {
    if (!profile || !title.trim()) return;
    setLoading(true);

    const accessCode = isPublic ? null : generateCode();

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        session_type: sessionType,
        user1_id: profile.id,
        user2_id: profile.id, // creator is both for group
        status: 'active',
        started_at: new Date().toISOString(),
        is_group: true,
        is_public: isPublic,
        access_code: accessCode,
        creator_id: profile.id,
        max_participants: 20,
        title: title.trim(),
      })
      .select('id')
      .single();

    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Add creator as participant
    await supabase.from('session_participants').insert({
      session_id: session.id,
      user_id: profile.id,
    });

    navigate(`/group-session/${session.id}`);
  };

  const sessionTypes = [
    { icon: BookOpen, label: t('recitation'), value: 'recitation' as const },
    { icon: Users, label: t('memorization'), value: 'memorization' as const },
    { icon: ClipboardCheck, label: t('tests'), value: 'test' as const },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-border/50">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-2xl font-bold text-foreground text-center">{t('createGroupSession')}</h2>

              {/* Title */}
              <div className="space-y-2">
                <Label>{t('sessionTitle')}</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t('sessionTitle')}
                  className="text-right"
                  dir="rtl"
                />
              </div>

              {/* Session Type */}
              <div className="space-y-2">
                <Label>{t('startSession')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {sessionTypes.map(st => (
                    <button
                      key={st.value}
                      onClick={() => setSessionType(st.value)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-all ${
                        sessionType === st.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/50 text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <st.icon className="h-5 w-5" />
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Public/Private */}
              <div className="space-y-2">
                <Label>{t('publicSession')} / {t('privateSession')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                      isPublic ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/30'
                    }`}
                  >
                    <Globe className={`h-6 w-6 ${isPublic ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${isPublic ? 'text-primary' : 'text-muted-foreground'}`}>
                      {t('publicSession')}
                    </span>
                    <span className="text-[10px] text-muted-foreground text-center">{t('publicSessionDesc')}</span>
                  </button>
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                      !isPublic ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/30'
                    }`}
                  >
                    <Lock className={`h-6 w-6 ${!isPublic ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${!isPublic ? 'text-primary' : 'text-muted-foreground'}`}>
                      {t('privateSession')}
                    </span>
                    <span className="text-[10px] text-muted-foreground text-center">{t('privateSessionDesc')}</span>
                  </button>
                </div>
              </div>

              <Button
                onClick={handleCreate}
                disabled={loading || !title.trim()}
                className="w-full gradient-emerald border-0 text-primary-foreground"
              >
                {loading ? '...' : t('createGroupSession')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
