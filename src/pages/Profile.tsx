import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Star, ArrowRight } from 'lucide-react';

export default function Profile() {
  const { t, dir } = useI18n();
  const { profile, refreshProfile, loading, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [level, setLevel] = useState(profile?.level || 'beginner');
  const [saving, setSaving] = useState(false);

  if (loading || !profile) {
    return <div dir={dir} className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, gender, level })
      .eq('user_id', user!.id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('save'), description: 'تم حفظ الملف الشخصي' });
      await refreshProfile();
    }
    setSaving(false);
  };

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-lg px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 gap-2">
          <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('home')}
        </Button>

        <Card className="border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <span className="text-2xl font-bold text-primary">{profile.display_name[0]}</span>
            </div>
            <CardTitle>{t('profile')}</CardTitle>
            <div className="flex items-center justify-center gap-2 text-gold">
              <Star className="h-5 w-5 fill-current" />
              <span className="font-bold">{Number(profile.average_rating).toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">({profile.total_sessions} {t('sessions')})</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('gender')}</Label>
                <Select value={gender} onValueChange={v => setGender(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('male')}</SelectItem>
                    <SelectItem value="female">{t('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('level')}</Label>
                <Select value={level} onValueChange={v => setLevel(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">{t('beginner')}</SelectItem>
                    <SelectItem value="intermediate">{t('intermediate')}</SelectItem>
                    <SelectItem value="advanced">{t('advanced')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-emerald border-0 text-primary-foreground">
              {saving ? '...' : t('save')}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
