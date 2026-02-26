import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type Language = 'ar' | 'en';

const translations = {
  ar: {
    appName: 'تلاوتي',
    appTagline: 'تصحيح تلاوة القرآن الكريم',
    welcome: 'مرحباً',
    welcomeBack: 'أهلاً بعودتك',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    name: 'الاسم',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    level: 'المستوى',
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
    recitation: 'تصحيح التلاوة',
    recitationDesc: 'تبادل القراءة والتصحيح مع طالب آخر',
    memorization: 'الحفظ (التسميع)',
    memorizationDesc: 'تبادل التسميع والتقييم',
    tests: 'الاختبارات',
    testsDesc: 'اختبار عشوائي متبادل بين الطلاب',
    sessions: 'الجلسات',
    rating: 'التقييم',
    topStudents: 'أفضل الطلاب',
    invitations: 'الدعوات',
    sentInvites: 'الدعوات المرسلة',
    receivedInvites: 'الدعوات الواردة',
    profile: 'الملف الشخصي',
    statistics: 'الإحصائيات',
    settings: 'الإعدادات',
    startSession: 'ابدأ جلسة',
    waiting: 'جارٍ البحث عن شريك...',
    endSession: 'إنهاء الجلسة',
    mute: 'كتم',
    unmute: 'تشغيل',
    ratePartner: 'قيّم شريكك',
    comment: 'تعليق (اختياري)',
    submit: 'إرسال',
    cancel: 'إلغاء',
    save: 'حفظ',
    edit: 'تعديل',
    search: 'بحث',
    noResults: 'لا توجد نتائج',
    completedSessions: 'الجلسات المكتملة',
    averageRating: 'متوسط التقييم',
    darkMode: 'الوضع الداكن',
    lightMode: 'الوضع الفاتح',
    language: 'اللغة',
    home: 'الرئيسية',
    getStarted: 'ابدأ الآن',
    heroTitle: 'تعلّم القرآن مع أقرانك',
    heroSubtitle: 'منصة تربط طلاب القرآن الكريم لتصحيح التلاوة والحفظ عبر جلسات صوتية مباشرة',
    feature1Title: 'تصحيح مباشر',
    feature1Desc: 'اتصال صوتي مباشر مع طلاب آخرين لتصحيح التلاوة',
    feature2Title: 'تبادل الأدوار',
    feature2Desc: 'كل طالب يقرأ ثم يصحح للآخر بالتناوب',
    feature3Title: 'اختبارات متبادلة',
    feature3Desc: 'اختبر نفسك مع طلاب آخرين في الحفظ والتجويد',
    signInWithGoogle: 'الدخول بحساب Google',
    orContinueWith: 'أو',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    dontHaveAccount: 'ليس لديك حساب؟',
    setupProfile: 'إعداد الملف الشخصي',
    completeProfile: 'أكمل ملفك الشخصي للبدء',
    groupSession: 'جلسة جماعية',
    createGroupSession: 'إنشاء جلسة جماعية',
    publicSession: 'جلسة عامة',
    privateSession: 'جلسة خاصة',
    publicSessionDesc: 'تظهر للجميع ويمكن لأي شخص من نفس الجنس الانضمام',
    privateSessionDesc: 'الدخول عبر رابط أو رمز دخول فقط',
    sessionTitle: 'عنوان الجلسة',
    accessCode: 'رمز الدخول',
    joinSession: 'انضمام',
    openSessions: 'الجلسات المفتوحة',
    participants: 'المشاركون',
    raiseHand: 'رفع اليد',
    lowerHand: 'إنزال اليد',
    muteParticipant: 'كتم المشارك',
    startIndividual: 'جلسة فردية',
    noOpenSessions: 'لا توجد جلسات مفتوحة حالياً',
    enterCode: 'أدخل رمز الدخول',
    joinByCode: 'انضمام برمز',
    creator: 'المنشئ',
    leaveSession: 'مغادرة الجلسة',
    shareViaWhatsApp: 'مشاركة عبر واتساب',
    copyLink: 'نسخ الرابط',
    linkCopied: 'تم نسخ الرابط',
    shareSession: 'مشاركة الجلسة',
  },
  en: {
    appName: 'Tilawati',
    appTagline: 'Quran Recitation Correction',
    welcome: 'Welcome',
    welcomeBack: 'Welcome back',
    login: 'Log In',
    signup: 'Sign Up',
    logout: 'Log Out',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    level: 'Level',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    recitation: 'Recitation Correction',
    recitationDesc: 'Take turns reading and correcting with another student',
    memorization: 'Memorization (Tasmi\')',
    memorizationDesc: 'Practice reciting from memory and get evaluated',
    tests: 'Tests',
    testsDesc: 'Random mutual testing between students',
    sessions: 'Sessions',
    rating: 'Rating',
    topStudents: 'Top Students',
    invitations: 'Invitations',
    sentInvites: 'Sent Invites',
    receivedInvites: 'Received Invites',
    profile: 'Profile',
    statistics: 'Statistics',
    settings: 'Settings',
    startSession: 'Start Session',
    waiting: 'Searching for a partner...',
    endSession: 'End Session',
    mute: 'Mute',
    unmute: 'Unmute',
    ratePartner: 'Rate Your Partner',
    comment: 'Comment (optional)',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    search: 'Search',
    noResults: 'No results found',
    completedSessions: 'Completed Sessions',
    averageRating: 'Average Rating',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    language: 'Language',
    home: 'Home',
    getStarted: 'Get Started',
    heroTitle: 'Learn Quran With Your Peers',
    heroSubtitle: 'A platform connecting Quran students for recitation correction and memorization through live voice sessions',
    feature1Title: 'Live Correction',
    feature1Desc: 'Direct voice connection with other students for recitation correction',
    feature2Title: 'Role Swapping',
    feature2Desc: 'Each student reads then corrects the other in turns',
    feature3Title: 'Mutual Tests',
    feature3Desc: 'Test yourself with other students in memorization and tajweed',
    signInWithGoogle: 'Sign in with Google',
    orContinueWith: 'or',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    setupProfile: 'Setup Profile',
    completeProfile: 'Complete your profile to get started',
    groupSession: 'Group Session',
    createGroupSession: 'Create Group Session',
    publicSession: 'Public Session',
    privateSession: 'Private Session',
    publicSessionDesc: 'Visible to everyone, anyone of the same gender can join',
    privateSessionDesc: 'Access via link or code only',
    sessionTitle: 'Session Title',
    accessCode: 'Access Code',
    joinSession: 'Join',
    openSessions: 'Open Sessions',
    participants: 'Participants',
    raiseHand: 'Raise Hand',
    lowerHand: 'Lower Hand',
    muteParticipant: 'Mute Participant',
    startIndividual: 'Individual Session',
    noOpenSessions: 'No open sessions available',
    enterCode: 'Enter access code',
    joinByCode: 'Join by Code',
    creator: 'Creator',
    leaveSession: 'Leave Session',
    shareViaWhatsApp: 'Share via WhatsApp',
    copyLink: 'Copy Link',
    linkCopied: 'Link Copied',
    shareSession: 'Share Session',
  },
} as const;

type TranslationKey = keyof typeof translations.ar;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('tilawati-lang');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('tilawati-lang', lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || key;
  }, [language]);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
