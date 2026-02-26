import { motion } from 'framer-motion';
import { BookOpen, Repeat, ClipboardCheck, Star, Users, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { IslamicPattern } from '@/components/IslamicPattern';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export default function Index() {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const features = [
    { icon: Mic, title: t('feature1Title'), desc: t('feature1Desc'), color: 'from-emerald-600 to-emerald-800' },
    { icon: Repeat, title: t('feature2Title'), desc: t('feature2Desc'), color: 'from-amber-500 to-amber-700' },
    { icon: ClipboardCheck, title: t('feature3Title'), desc: t('feature3Desc'), color: 'from-emerald-500 to-emerald-700' },
  ];

  const sessionTypes = [
    { icon: BookOpen, title: t('recitation'), desc: t('recitationDesc') },
    { icon: Users, title: t('memorization'), desc: t('memorizationDesc') },
    { icon: ClipboardCheck, title: t('tests'), desc: t('testsDesc') },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <IslamicPattern className="text-foreground" opacity={0.04} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl gradient-emerald shadow-lg"
          >
            <span className="text-4xl font-bold text-primary-foreground font-serif">ت</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-4 text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl"
          >
            {t('heroTitle')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            {t('heroSubtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Button
              size="lg"
              className="gradient-emerald border-0 px-8 text-lg text-primary-foreground shadow-lg hover:opacity-90"
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
            >
              {t('getStarted')}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-all hover:shadow-lg hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-md`}>
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-foreground">{f.title}</h3>
                    <p className="text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Session Types */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <IslamicPattern className="text-foreground" opacity={0.03} />
        <div className="container relative mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl"
          >
            {t('startSession')}
          </motion.h2>

          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
            {sessionTypes.map((s, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="group cursor-pointer border-border/50 bg-card/80 backdrop-blur transition-all hover:shadow-xl hover:border-primary/30 hover:-translate-y-1">
                  <CardContent className="flex flex-col items-center p-8 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <s.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-foreground">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-8 text-center">
            {[
              { value: '١٠٠٠+', label: t('sessions') },
              { value: '٤.٨', label: t('rating'), icon: Star },
              { value: '٥٠٠+', label: t('topStudents') },
            ].map((stat, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <div className="text-3xl font-bold text-gold md:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t('appName')} — {t('appTagline')}</p>
        </div>
      </footer>
    </div>
  );
}
