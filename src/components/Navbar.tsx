import { Moon, Sun, Globe, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(user ? '/dashboard' : '/')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-emerald">
            <span className="text-lg font-bold text-primary-foreground">ت</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{t('appName')}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} className="rounded-full" title={t('language')}>
            <Globe className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full" title={theme === 'dark' ? t('lightMode') : t('darkMode')}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {user ? (
            <>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/profile')}>
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/auth')}>
                {t('login')}
              </Button>
              <Button size="sm" className="gradient-emerald border-0 text-primary-foreground hover:opacity-90" onClick={() => navigate('/auth')}>
                {t('signup')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
