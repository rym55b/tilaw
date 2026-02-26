import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Send, Star, Search } from 'lucide-react';

export default function Invitations() {
  const { t, dir } = useI18n();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sessionType, setSessionType] = useState('recitation');

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', profile.id)
        .eq('is_available', true)
        .eq('gender', profile.gender)
        .order('average_rating', { ascending: false })
        .limit(20);

      if (filterLevel !== 'all') query = query.eq('level', filterLevel as any);
      if (searchQuery) query = query.ilike('display_name', `%${searchQuery}%`);

      const { data } = await query;
      setStudents(data || []);
    };
    fetch();
  }, [profile, searchQuery, filterLevel]);

  const sendInvite = async (receiverId: string) => {
    if (!profile) return;
    const { error } = await supabase.from('invitations').insert({
      sender_id: profile.id,
      receiver_id: receiverId,
      session_type: sessionType as any,
    });
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('invitations'), description: 'تم إرسال الدعوة بنجاح' });
    }
  };

  if (!profile) return null;

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-2 gap-2">
          <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('home')}
        </Button>

        <h2 className="text-2xl font-bold text-foreground">{t('invitations')}</h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-36"><SelectValue placeholder={t('level')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="beginner">{t('beginner')}</SelectItem>
              <SelectItem value="intermediate">{t('intermediate')}</SelectItem>
              <SelectItem value="advanced">{t('advanced')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recitation">{t('recitation')}</SelectItem>
              <SelectItem value="memorization">{t('memorization')}</SelectItem>
              <SelectItem value="test">{t('tests')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students list */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">{t('topStudents')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noResults')}</p>
            ) : (
              students.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="font-bold text-primary">{s.display_name[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{s.display_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-gold fill-current" />
                        {Number(s.average_rating).toFixed(1)}
                        <span>•</span>
                        <span>{s.level === 'beginner' ? t('beginner') : s.level === 'intermediate' ? t('intermediate') : t('advanced')}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="gradient-emerald border-0 text-primary-foreground gap-1" onClick={() => sendInvite(s.id)}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
