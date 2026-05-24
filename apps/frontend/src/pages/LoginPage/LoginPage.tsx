import { motion } from 'framer-motion';
import { Github, Terminal, Gamepad2, Sparkles, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import logoUrl from '../../assets/logo.svg';

export function LoginPage() {
  const { t } = useTranslation();
  const { loginWithGithub, loginWithMock, error } = useAuth();

  return (
    <div className="min-h-screen bg-gaming-base flex flex-col justify-center items-center p-4 relative overflow-hidden font-body selection:bg-status-boss/30 selection:text-text-primary">
      {/* Dynamic Background Grid Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-gaming-grid)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-gaming-grid)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Ambient Neon Glows */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-status-quest/10 blur-[120px] top-[-10%] left-[-10%] pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-status-boss/10 blur-[120px] bottom-[-10%] right-[-10%] pointer-events-none" />

      {/* Main Login Frame */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-gaming-card border border-gaming-border p-8 rounded-2xl shadow-2xl relative z-10 flex flex-col items-center gap-6"
      >
        {/* Retro Glowing Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-status-quest to-status-boss flex items-center justify-center font-bold text-solarized-base3 shadow-lg mb-2"
          >
            <Gamepad2 size={28} />
          </motion.div>

          <h1 className="text-3xl font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary via-solarized-blue to-status-boss">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-xs text-status-campfire font-semibold uppercase tracking-wider font-display">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Separator Line */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gaming-border to-transparent" />

        {/* TODO: Make it dynamic to the user's preferred language, using useTranslation hook.  */}
        {/* TODO: Review that description. and make something more attractive and engaging once we style the website with the new theme.  */}

        {/* RPG Lore Description Box */}
        <div className="bg-gaming-base/60 border border-gaming-border p-4 rounded-xl text-xs text-text-secondary leading-relaxed flex flex-col gap-2 relative">
          <div className="flex items-center gap-2 text-status-quest font-semibold font-display">
            <Terminal size={14} />
            <span>SYSTEM_LORE_BOOT.SH</span>
          </div>
          <p>{t('auth.flavorText')}</p>
          <div className="absolute right-3 bottom-2 text-gaming-border opacity-30 select-none">
            <Sparkles size={48} />
          </div>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full p-3 rounded-lg bg-solarized-red/10 border border-solarized-red/30 text-xs text-solarized-red flex items-center gap-3"
          >
            <ShieldAlert size={18} className="shrink-0" />
            <span>
              {error === 'invalidSession' ? t('auth.invalidSession') : t('auth.loginError')}
            </span>
          </motion.div>
        )}

        {/* Call to Actions (Interactive Buttons) */}
        <div className="flex flex-col gap-3 w-full mt-2">
          {/* GitHub Real OAuth CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loginWithGithub}
            className="w-full py-3.5 px-4 rounded-xl bg-solarized-blue text-gaming-base font-bold font-display flex items-center justify-center gap-3 transition-all hover:bg-solarized-blue/90 shadow-md cursor-pointer"
          >
            <Github size={20} />
            <span>{t('auth.loginWithGithub')}</span>
          </motion.button>

          {/*TODO: Connect as a mock student instead */}
          {/* Local Developer Bypass CTA */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loginWithMock}
            className="w-full py-3 px-4 rounded-xl border border-gaming-border bg-gaming-base/40 text-text-secondary font-semibold font-display flex items-center justify-center gap-3 transition-all hover:bg-gaming-card cursor-pointer"
          >
            <Terminal size={16} className="text-status-campfire" />
            <span>{t('auth.developerBypass')}</span>
          </motion.button>
        </div>

        {/* Bypass Visual Warning Banner */}
        <div className="text-[10px] text-text-muted text-center max-w-[280px]">
          {t('auth.bypassWarning')}
        </div>
      </motion.div>

      {/*TODO: Remove duplicate logo, site. Just one clickable logo with an alt text. */}

      {/* Retro HUD Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="mt-8 flex flex-col items-center justify-center gap-2 text-[11px] text-text-muted font-display uppercase tracking-widest"
      >
        <a
          href="https://aptitek.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity pointer-events-auto"
        >
          <img
            src={logoUrl}
            alt="Aptitek Logo"
            className="h-6 w-auto opacity-70 hover:opacity-100 transition-opacity"
          />
        </a>
      </motion.div>
    </div>
  );
}

export default LoginPage;
