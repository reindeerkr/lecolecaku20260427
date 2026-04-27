/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Instagram, 
  Youtube, 
  Github,
  Menu, 
  X, 
  ChevronRight, 
  MapPin, 
  Phone, 
  BookOpen, 
  Award,
  LogOut,
  Settings
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { testConnection } from '@/lib/test-connection';

// Main Sections
import Hero from './components/Hero';
import About from './components/About';
import ScheduleGallery from './components/ScheduleGallery';
import ClassList from './components/ClassList';
import CinematicReviews from './components/CinematicReviews';
import BrandTimeline from './components/BrandTimeline';
import FreeRecipeMedia from './components/FreeRecipeMedia';
import ContactMap from './components/ContactMap';
import SNSFeeds from './components/SNSFeeds';
import AdminDashboard from './components/AdminDashboard';
import LoginModal from './components/LoginModal';

import LoadingScreen from './components/LoadingScreen';

import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { AppConfig } from './types';
import { handleFirestoreError, OperationType, onQuotaError, clearQuotaError } from '@/lib/firestore-errors';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    testConnection();
    
    // Listen for quota errors anywhere in the app
    const unsubscribeQuota = onQuotaError((isExceeded) => {
      setIsQuotaExceeded(isExceeded);
      // If quota exceeded, we might never get the config, so we should allow showing what we have (or error)
      if (isExceeded) setIsInitialLoading(false);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'main'), (snap) => {
      if (snap.exists()) {
        const mainData = snap.data() as AppConfig;
        setConfig(prev => ({
          ...mainData,
          freeRecipeMedia: prev?.freeRecipeMedia || mainData.freeRecipeMedia
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/main');
    });

    const unsubscribeMedia = onSnapshot(doc(db, 'config', 'media'), (snap) => {
      if (snap.exists()) {
        const mediaData = snap.data() as any;
        setConfig(prev => ({
          ...(prev || {} as AppConfig),
          freeRecipeMedia: mediaData.freeRecipeMedia
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/media');
    });

    const unsubscribeHero = onSnapshot(doc(db, 'config', 'hero'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setConfig(prev => ({
          ...(prev || {} as AppConfig),
          hero: data.hero || data
        }));
      }
      // Give a small delay to ensure other snapshots that started at the same time have a chance to arrive
      setTimeout(() => setIsInitialLoading(false), 200);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/hero');
      setIsInitialLoading(false);
    });

    const unsubscribeAbout = onSnapshot(doc(db, 'config', 'about'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setConfig(prev => ({
          ...(prev || {} as AppConfig),
          about: data.about || data
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/about');
    });

    return () => {
      unsubscribeQuota();
      unsubscribeAuth();
      unsubscribeConfig();
      unsubscribeMedia();
      unsubscribeHero();
      unsubscribeAbout();
    };
  }, []);

  const toggleAdmin = () => {
    if (user) {
      setIsAdminMode(!isAdminMode);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const navItems = [
    { name: 'ABOUT', id: 'about' },
    { name: 'SCHEDULE', id: 'schedule' },
    { name: 'CLASSES', id: 'classes' },
    { name: 'ARCHIVE', id: 'archive' },
    { name: 'RECIPE', id: 'recipes' },
    { name: 'CONTACT', id: 'contact' },
  ];

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  if (isAdminMode && user) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white">
        <AdminDashboard onExit={() => setIsAdminMode(false)} />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-brand-warm text-brand-ink">
      {/* GNB - Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#111111]/80 backdrop-blur-xl border-b border-white/5">
        {isQuotaExceeded && (
          <div className="bg-red-500/10 border-b border-red-500/20 py-2 px-6 md:px-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[9px] md:text-[10px] text-red-500 uppercase tracking-widest font-medium leading-relaxed">
                Firestore Quota Exceeded. If you just upgraded to Blaze, please wait 5-10 mins or click retry.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                clearQuotaError();
                window.location.reload();
              }}
              className="h-7 px-3 text-[9px] uppercase tracking-widest border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors shrink-0"
            >
              <RefreshCcw className="w-3 h-3 mr-2" />
              Retry
            </Button>
          </div>
        )}
        <nav className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-brand-accent flex items-center justify-center opacity-60 overflow-hidden shrink-0">
              {config?.logo?.imageUrl ? (
                <img src={config.logo.imageUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[10px] text-brand-accent font-serif italic">
                  {config?.logo?.circleText || "LC"}
                </span>
              )}
            </div>
            <h1 className="text-xl font-serif tracking-[0.2em] font-light uppercase italic">
              {config?.logo?.text || "L'ecole Caku"}
            </h1>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-12">
            {(config?.gnbMenus && config.gnbMenus.length > 0 ? config.gnbMenus : navItems).map((item, idx) => (
              <a 
                key={idx} 
                href={'path' in item ? item.path : `#${item.id}`}
                className="text-[10px] uppercase tracking-[0.4em] font-light hover:text-brand-accent transition-all duration-500 opacity-60 hover:opacity-100"
              >
                {'title' in item ? item.title : item.name}
              </a>
            ))}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleAdmin}
              className="text-neutral-600 hover:text-brand-accent hover:bg-transparent"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </nav>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-brand-warm flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {(config?.gnbMenus && config.gnbMenus.length > 0 ? config.gnbMenus : navItems).map((item, idx) => (
              <a 
                key={idx} 
                href={'path' in item ? item.path : `#${item.id}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-serif text-brand-ink"
              >
                {'title' in item ? item.title : item.name}
              </a>
            ))}
            <Button 
              variant="outline" 
              onClick={toggleAdmin}
              className="mt-4"
            >
              관리자 모드
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        <Hero config={config?.hero} instagramUrl={config?.socialLinks?.instagram} />
        <section id="about" className="py-24">
          <About config={config?.about} />
        </section>
        <section id="schedule" className="py-16 md:py-24 bg-neutral-50">
          <ScheduleGallery config={config?.schedule} />
        </section>
        <section id="classes" className="py-16 md:py-24">
          <ClassList config={config?.classList} />
        </section>
        <div className="py-16 md:py-24 bg-brand-warm text-brand-ink">
          <CinematicReviews config={config?.reviews} />
        </div>
        <section id="archive" className="py-16 md:py-24">
          <BrandTimeline config={config?.history} />
        </section>
        <section id="recipes" className="py-16 md:py-24 bg-white/40">
          <FreeRecipeMedia config={config?.freeRecipeMedia} />
        </section>
        <section id="contact" className="py-16 md:py-24">
          <ContactMap config={config?.mapInfo} />
        </section>
        <div className="py-16 md:py-24 border-t border-brand-accent/10">
          <SNSFeeds config={config?.instagramFeed} />
        </div>
      </main>

      <footer className="bg-brand-ink text-neutral-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8 items-center">
          <div className="text-center md:text-left">
            <h2 className="text-white font-serif text-lg mb-2">{config?.footer?.title || config?.logo?.text || "L'ecole Caku"}</h2>
            <p className="text-sm">{config?.footer?.address || "레꼴케이쿠 베이킹 스튜디오 | 대표: 함정임"}</p>
            <p className="text-xs mt-4">{config?.footer?.copyright || "© 2026 L'ecole Caku. All Rights Reserved."}</p>
          </div>
          <div className="flex gap-6">
            {config?.socialLinks?.instagram && (
              <a href={config.socialLinks.instagram.startsWith('http') ? config.socialLinks.instagram : `https://instagram.com/${config.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {config?.socialLinks?.youtube && (
              <a href={config.socialLinks.youtube.startsWith('http') ? config.socialLinks.youtube : `https://youtube.com/${config.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            )}
            {config?.socialLinks?.blog && (
              <a href={config.socialLinks.blog} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors font-bold text-xs border border-neutral-700 px-2 py-1 rounded-sm">
                BLOG
              </a>
            )}
            {config?.socialLinks?.github && (
              <a href={config.socialLinks.github.startsWith('http') ? config.socialLinks.github : `https://github.com/${config.socialLinks.github}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </footer>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onSuccess={() => {
          setIsLoginModalOpen(false);
          setIsAdminMode(true);
        }}
      />
      <Toaster position="bottom-right" theme="light" />
    </div>
  );
}

