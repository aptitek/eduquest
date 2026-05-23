import { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogOut, ChevronDown, Languages, Shield, Check } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useGameStore } from '../../features/game/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

export function AccountDropdown() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const { setActiveView } = useGameStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const username = user.githubName || user.githubUsername || user.githubEmail.split('@')[0];
  const avatarUrl =
    user.githubAvatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button using DaisyUI 'btn' styling */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost hover:bg-gaming-base/40 border border-gaming-border hover:border-solarized-blue/50 flex items-center gap-2.5 h-auto min-h-0 py-1.5 px-3 rounded-xl transition-all select-none cursor-pointer focus:outline-none normal-case"
      >
        {/* DaisyUI Round Avatar with Online Status & Rings */}
        <div className="avatar online">
          <div className="w-8 rounded-full ring ring-solarized-blue/20 ring-offset-2 ring-offset-gaming-base">
            <img src={avatarUrl} alt={username} />
          </div>
        </div>
        <span className="hidden sm:block text-xs font-semibold text-text-primary font-display max-w-[120px] truncate">
          {username}
        </span>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Content Card styled with DaisyUI classes */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="card card-compact absolute right-0 mt-2 w-64 bg-gaming-card border border-gaming-border rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="card-body p-0">
              {/* Header Identity Section with a larger round Daisy Avatar */}
              <div className="p-4 bg-gaming-base/40 border-b border-gaming-border flex items-center gap-3">
                <div className="avatar">
                  <div className="w-10 rounded-full ring ring-solarized-blue/10">
                    <img src={avatarUrl} alt={username} />
                  </div>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold text-text-primary truncate font-display">
                    {username}
                  </span>
                  <span className="text-[10px] text-text-muted truncate font-body">
                    {user.githubEmail}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield
                      size={10}
                      className={user.isAdmin ? 'text-status-campfire' : 'text-solarized-blue'}
                    />
                    <span className="text-[9px] uppercase tracking-wider font-semibold font-display text-text-secondary">
                      {user.isAdmin
                        ? t('common.admin') || 'ADMIN'
                        : t('common.student') || 'APPRENTI'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Actions using DaisyUI 'menu' component */}
              <ul className="menu menu-sm p-1.5 border-b border-gaming-border flex flex-col gap-0.5">
                <li>
                  <button
                    onClick={() => {
                      setActiveView('profile');
                      setIsOpen(false);
                    }}
                    className="px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-gaming-base/60 flex items-center gap-2.5 transition-colors font-display font-semibold"
                  >
                    <UserIcon size={14} className="text-solarized-blue" />
                    <span>{t('auth.profile') || 'Mon Profil'}</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="px-3 py-2 rounded-lg text-xs text-status-campfire hover:bg-solarized-red/10 flex items-center gap-2.5 transition-colors font-display font-semibold"
                  >
                    <LogOut size={14} />
                    <span>{t('auth.logout')}</span>
                  </button>
                </li>
              </ul>

              {/* Language Switch Section with DaisyUI buttons */}
              <div className="p-3 bg-gaming-base/20 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] text-text-muted font-display font-semibold uppercase tracking-wider">
                  <Languages size={12} />
                  <span>{t('common.language') || 'LANGUE'}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setLocale('fr')}
                    className={`btn btn-xs py-1.5 px-2 h-auto min-h-0 font-bold font-display flex items-center justify-center gap-1 transition-all cursor-pointer border-gaming-border ${
                      locale === 'fr'
                        ? 'btn-primary text-white shadow-sm'
                        : 'btn-ghost bg-gaming-base/40 text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <span>FR</span>
                    {locale === 'fr' && <Check size={10} />}
                  </button>
                  <button
                    onClick={() => setLocale('en')}
                    className={`btn btn-xs py-1.5 px-2 h-auto min-h-0 font-bold font-display flex items-center justify-center gap-1 transition-all cursor-pointer border-gaming-border ${
                      locale === 'en'
                        ? 'btn-primary text-white shadow-sm'
                        : 'btn-ghost bg-gaming-base/40 text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <span>EN</span>
                    {locale === 'en' && <Check size={10} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AccountDropdown;
