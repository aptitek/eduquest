import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Languages, Check } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { InstitutionalProfileCard } from '../organisms/InstitutionalProfileCard/InstitutionalProfileCard';
import { User } from '@eduquest/shared';

import { motion, AnimatePresence } from 'framer-motion';

export function AccountDropdown() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useTranslation();
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

  const username =
    user.displayName || user.firstName || user.githubUsername || user.email.split('@')[0];
  const avatarUrl =
    user.avatarUrl ||
    user.githubAvatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  const handleUpdateProfile = async (data: Partial<User>) => {
    // TODO: Connect to real API when available
    console.log('Update profile requested:', data);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost hover:bg-gaming-base/40 border border-gaming-border hover:border-solarized-blue/50 flex items-center gap-2.5 h-auto min-h-0 py-1.5 px-3 rounded-xl transition-all select-none cursor-pointer focus:outline-none normal-case"
      >
        {/* Avatar with Status Indicator */}
        <div className="relative">
          <div className="avatar">
            <div className="w-8 rounded-full ring ring-solarized-blue/20 ring-offset-2 ring-offset-gaming-base">
              <img src={avatarUrl} alt={username} />
            </div>
          </div>
          <StatusIndicator
            status="success"
            className="absolute -bottom-0.5 -right-0.5 border-2 border-gaming-base w-3.5 h-3.5"
          />
        </div>
        <span className="hidden sm:block text-xs font-semibold text-text-primary font-display max-w-[120px] truncate">
          {username}
        </span>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-[500px] max-w-[90vw] bg-gaming-card border border-gaming-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Editable Profile Card Area */}
            <div className="flex-1 max-h-[70vh] overflow-y-auto">
              <InstitutionalProfileCard
                user={user}
                onUpdateProfile={handleUpdateProfile}
                className="shadow-none border-none rounded-none border-b border-gaming-border"
              />
            </div>

            {/* Footer: Language Selector & Disconnect */}
            <div className="p-3 bg-gaming-base/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-text-muted font-display font-semibold uppercase tracking-wider">
                  <Languages size={14} />
                  <span>{t('common.language') || 'LANGUE'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocale('fr')}
                    className={`btn btn-xs py-1.5 px-3 h-auto min-h-0 font-bold font-display flex items-center justify-center gap-1 transition-all cursor-pointer border-gaming-border ${
                      locale === 'fr'
                        ? 'btn-primary text-white shadow-sm'
                        : 'btn-ghost bg-gaming-base/40 text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <span>FR</span>
                    {locale === 'fr' && <Check size={12} />}
                  </button>
                  <button
                    onClick={() => setLocale('en')}
                    className={`btn btn-xs py-1.5 px-3 h-auto min-h-0 font-bold font-display flex items-center justify-center gap-1 transition-all cursor-pointer border-gaming-border ${
                      locale === 'en'
                        ? 'btn-primary text-white shadow-sm'
                        : 'btn-ghost bg-gaming-base/40 text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <span>EN</span>
                    {locale === 'en' && <Check size={12} />}
                  </button>
                </div>
              </div>

              <div className="divider my-0"></div>

              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full btn btn-sm btn-ghost text-status-campfire hover:bg-solarized-red/10 flex items-center justify-center gap-2 transition-colors font-display font-semibold"
              >
                <LogOut size={16} />
                <span>{t('auth.logout')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AccountDropdown;
