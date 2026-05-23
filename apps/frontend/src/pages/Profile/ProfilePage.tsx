import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon,
  Shield,
  School,
  Lock,
  ArrowLeft,
  Save,
  Loader2,
  Sparkles,
  BookOpen,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, student, character, setUserSession, setActiveView } = useGameStore();

  const [activeTab, setActiveTab] = useState<'account' | 'student' | 'stats'>('account');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [githubName, setGithubName] = useState(user?.githubName || '');
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || '');
  const [githubEmail, setGithubEmail] = useState(user?.githubEmail || '');
  const [githubAvatar, setGithubAvatar] = useState(user?.githubAvatar || '');

  const [photoUrl, setPhotoUrl] = useState(student?.photoUrl || '');
  const [instEmail, setInstEmail] = useState(student?.institutionalEmail || '');
  const [birthDate, setBirthDate] = useState(
    student?.birthDate ? student.birthDate.substring(0, 10) : ''
  );
  const [pronounsInput, setPronounsInput] = useState(student?.pronouns?.join(', ') || '');
  const [bio, setBio] = useState(student?.internalDescription || '');

  const [characterClass, setCharacterClass] = useState(
    character?.characterClass || 'Mage Frontend'
  );

  if (!user || !student || !character) return null;

  // Available Character Classes in JDR
  const availableClasses = ['Mage Frontend', 'Archer Backend', 'Warrior DevOps', 'Rogue Fullstack'];

  // Save profile changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setErrorMessage(null);

    const token = localStorage.getItem('eduquest_token');
    const pronounsArray = pronounsInput
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    try {
      const response = await fetch('http://localhost:8787/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          githubName,
          githubUsername,
          githubEmail,
          githubAvatar,
          photoUrl,
          institutionalEmail: instEmail,
          birthDate: birthDate || null,
          pronouns: pronounsArray,
          internalDescription: bio,
          characterClass,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Save new updated JWT session
        if (data.token) {
          localStorage.setItem('eduquest_token', data.token);
        }

        // Update Zustand global store
        setUserSession(data.user, data.student, data.character);

        setSuccess(true);
        // Clear message after 4 seconds
        setTimeout(() => setSuccess(null), 4000);
      } else {
        throw new Error(data.error || 'Server error occurred');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error.message);
      setSuccess(false);
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const pronounsList = pronounsInput
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Upper Navigation Row */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveView('map')}
          className="btn btn-ghost hover:bg-gaming-base/50 text-text-secondary hover:text-text-primary gap-2 cursor-pointer font-display font-semibold transition-all border border-gaming-border hover:border-solarized-blue/50 rounded-xl"
        >
          <ArrowLeft size={16} className="text-solarized-blue" />
          <span>{t('profile.backToMap')}</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-text-muted bg-gaming-card/40 px-3 py-1.5 rounded-xl border border-gaming-border/60">
          <Info size={12} className="text-solarized-blue" />
          <span>{t('layout.alpha')}</span>
        </div>
      </div>

      {/* Main Glassmorphic Profile Card */}
      <div className="card bg-gaming-card border border-gaming-border shadow-2xl rounded-2xl overflow-hidden">
        <div className="card-body p-6 md:p-8">
          {/* Success / Error Notification Banners */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="alert alert-success border border-emerald-500/20 bg-emerald-950/20 text-emerald-300 flex items-start gap-3 rounded-xl mb-6 shadow-md"
              >
                <CheckCircle2 size={18} className="mt-0.5" />
                <div className="text-xs font-semibold">{t('profile.saveSuccess')}</div>
              </motion.div>
            )}

            {success === false && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="alert alert-error border border-status-boss/20 bg-solarized-red/10 text-status-boss flex items-start gap-3 rounded-xl mb-6 shadow-md"
              >
                <AlertTriangle size={18} className="mt-0.5" />
                <div className="text-xs font-semibold">
                  {t('profile.saveError')} {errorMessage && `(${errorMessage})`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Hero Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-gaming-border/60 mb-6">
            <div className="avatar">
              <div className="w-20 h-20 rounded-2xl ring-4 ring-solarized-blue/20 ring-offset-2 ring-offset-gaming-base overflow-hidden">
                <img
                  src={
                    photoUrl ||
                    githubAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                  }
                  alt={githubName || githubUsername}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col text-center sm:text-left gap-1 min-w-0">
              <h2 className="text-2xl font-bold font-display text-text-primary flex items-center justify-center sm:justify-start gap-2">
                <span>{githubName || githubUsername || 'Aventurier'}</span>
                <span className="badge badge-sm bg-solarized-blue/10 border border-solarized-blue/30 text-solarized-blue font-semibold uppercase tracking-wider">
                  {characterClass}
                </span>
              </h2>
              <p className="text-xs text-text-muted font-body truncate">{githubEmail}</p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gaming-base border border-gaming-border text-[9px] font-semibold text-text-secondary uppercase">
                  <Shield
                    size={10}
                    className={user.isAdmin ? 'text-status-campfire' : 'text-solarized-blue'}
                  />
                  {user.isAdmin ? t('common.admin') : t('common.student')}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gaming-base border border-gaming-border text-[9px] font-semibold text-text-muted uppercase">
                  <School size={10} />
                  {t('profile.student.noSchool')}
                </span>
              </div>
            </div>
          </div>

          {/* Premium Custom Tabs */}
          <div className="flex border-b border-gaming-border/40 gap-2 mb-6 overflow-x-auto select-none no-scrollbar">
            {(['account', 'student', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 font-display text-xs font-bold border-b-2 cursor-pointer transition-all uppercase tracking-wider flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  activeTab === tab
                    ? 'border-solarized-blue text-solarized-blue'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab === 'account' && <UserIcon size={14} />}
                {tab === 'student' && <Sparkles size={14} />}
                {tab === 'stats' && <BookOpen size={14} />}
                <span>{t(`profile.tabs.${tab}`)}</span>
              </button>
            ))}
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSave} className="space-y-6">
            {/* TAB 1: Account & Identity */}
            {activeTab === 'account' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-sm font-bold text-text-primary font-display mb-1">
                    {t('profile.account.title')}
                  </h3>
                  <p className="text-xs text-text-muted mb-4">{t('profile.account.desc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.account.githubName')}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={githubName}
                      onChange={(e) => setGithubName(e.target.value)}
                      className="input input-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl"
                      placeholder="e.g. Jean Dupont"
                    />
                  </div>

                  {/* Username */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.account.githubUsername')}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={githubUsername}
                      onChange={(e) => setGithubUsername(e.target.value)}
                      className="input input-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl"
                      placeholder="e.g. jeandupont1337"
                    />
                  </div>

                  {/* Email */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.account.githubEmail')}
                      </span>
                    </label>
                    <input
                      type="email"
                      value={githubEmail}
                      onChange={(e) => setGithubEmail(e.target.value)}
                      className="input input-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl"
                      placeholder="e.g. jean@example.com"
                      required
                    />
                  </div>

                  {/* Avatar URL */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.account.githubAvatar')}
                      </span>
                    </label>
                    <input
                      type="url"
                      value={githubAvatar}
                      onChange={(e) => setGithubAvatar(e.target.value)}
                      className="input input-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Locked Administrative Fields */}
                <div className="pt-4 border-t border-gaming-border/40 space-y-4">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Lock size={12} className="text-status-boss/80" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      {t('profile.account.lockedField')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Role Admin Status */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text text-xs font-bold text-text-muted uppercase">
                          {t('profile.account.isAdmin')}
                        </span>
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gaming-border/80 bg-gaming-base/40 text-text-muted text-xs font-semibold cursor-not-allowed">
                        <Shield size={14} className="text-text-muted" />
                        <span>
                          {user.isAdmin
                            ? t('profile.account.adminStatus')
                            : t('profile.account.studentStatus')}
                        </span>
                      </div>
                    </div>

                    {/* School/Establishment (Stuck to null in default empty game) */}
                    <div className="form-control w-full">
                      <label className="label py-1">
                        <span className="label-text text-xs font-bold text-text-muted uppercase">
                          {t('profile.student.school')}
                        </span>
                      </label>
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-gaming-border/80 bg-gaming-base/40 text-text-muted text-xs font-semibold cursor-not-allowed">
                        <div className="flex items-center gap-2">
                          <School size={14} className="text-text-muted" />
                          <span>{t('profile.student.noSchool')}</span>
                        </div>
                        <span className="badge badge-ghost text-[9px] border-gaming-border/60">
                          NULL
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: RPG Student Persona */}
            {activeTab === 'student' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="text-sm font-bold text-text-primary font-display mb-1">
                    {t('profile.student.title')}
                  </h3>
                  <p className="text-xs text-text-muted mb-4">{t('profile.student.desc')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Institutional Email */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.student.instEmail')}
                      </span>
                    </label>
                    <input
                      type="email"
                      value={instEmail}
                      onChange={(e) => setInstEmail(e.target.value)}
                      className="input input-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl"
                      placeholder="e.g. apprentice@school.edu"
                    />
                  </div>

                  {/* Birthdate */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.student.birthDate')}
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="input input-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl"
                      />
                    </div>
                  </div>

                  {/* RPG Profile Picture Photo URL */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.student.photoUrl')}
                      </span>
                    </label>
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="input input-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Pronouns */}
                  <div className="form-control w-full">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.student.pronouns')}
                      </span>
                    </label>
                    <input
                      type="text"
                      value={pronounsInput}
                      onChange={(e) => setPronounsInput(e.target.value)}
                      className="input input-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl"
                      placeholder="e.g. He/Him, They/Them, Elle"
                    />

                    {/* Live Badge Preview of Pronouns */}
                    {pronounsList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pronounsList.map((p, idx) => (
                          <span
                            key={idx}
                            className="badge badge-sm border border-gaming-border bg-gaming-base/60 text-text-secondary text-[10px]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Biography / Description */}
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-xs font-bold text-text-secondary uppercase">
                      {t('profile.student.bio')}
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="textarea textarea-bordered w-full text-xs font-semibold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl leading-relaxed"
                    placeholder="Describe your role-playing personality or developer profile here..."
                  />
                </div>
              </motion.div>
            )}

            {/* TAB 3: RPG Statistics & Class */}
            {activeTab === 'stats' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-sm font-bold text-text-primary font-display mb-1">
                    {t('profile.stats.title')}
                  </h3>
                  <p className="text-xs text-text-muted mb-4">{t('profile.stats.desc')}</p>
                </div>

                {/* Character Class Select Form */}
                <div className="bg-gaming-base/30 p-4 rounded-xl border border-gaming-border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="form-control w-full sm:max-w-xs">
                    <label className="label py-1">
                      <span className="label-text text-xs font-bold text-text-secondary uppercase">
                        {t('profile.stats.classLabel')}
                      </span>
                    </label>
                    <select
                      value={characterClass}
                      onChange={(e) => setCharacterClass(e.target.value)}
                      className="select select-bordered text-xs font-bold bg-gaming-base border-gaming-border focus:border-solarized-blue/60 focus:outline-none rounded-xl w-full cursor-pointer"
                    >
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Current Level and XP Status */}
                  <div className="flex flex-col gap-1 w-full sm:max-w-xs">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-0.5">
                      <span className="text-status-boss">
                        {t('profile.stats.levelLabel')}: {character.currentLevel}
                      </span>
                      <span className="text-text-muted">
                        {character.stats.xp || 0} / {character.currentLevel * 100} {t('common.xp')}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gaming-base rounded-full border border-gaming-border overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-status-quest to-status-boss"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.floor(
                              ((character.stats.xp || 0) / (character.currentLevel * 100)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive RPG Stats Grid */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold font-display uppercase tracking-widest text-text-secondary">
                    {t('profile.stats.attributesTitle')}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* STR */}
                    <div className="p-4 rounded-xl border border-gaming-border bg-gaming-base/20 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold font-display text-text-primary uppercase mb-0.5">
                          Force (STR)
                        </div>
                        <div className="text-[10px] text-text-muted leading-tight">
                          {t('profile.stats.strDesc')}
                        </div>
                      </div>
                      <div className="text-xl font-black font-display text-text-secondary select-none">
                        {character.stats.str}
                      </div>
                    </div>

                    {/* DEX */}
                    <div className="p-4 rounded-xl border border-gaming-border bg-gaming-base/20 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold font-display text-text-primary uppercase mb-0.5">
                          Dextérité (DEX)
                        </div>
                        <div className="text-[10px] text-text-muted leading-tight">
                          {t('profile.stats.dexDesc')}
                        </div>
                      </div>
                      <div className="text-xl font-black font-display text-text-secondary select-none">
                        {character.stats.dex}
                      </div>
                    </div>

                    {/* INT */}
                    <div className="p-4 rounded-xl border border-gaming-border bg-gaming-base/20 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold font-display text-text-primary uppercase mb-0.5">
                          Intelligence (INT)
                        </div>
                        <div className="text-[10px] text-text-muted leading-tight">
                          {t('profile.stats.intDesc')}
                        </div>
                      </div>
                      <div className="text-xl font-black font-display text-status-boss select-none animate-pulse">
                        {character.stats.int}
                      </div>
                    </div>

                    {/* CHA */}
                    <div className="p-4 rounded-xl border border-gaming-border bg-gaming-base/20 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold font-display text-text-primary uppercase mb-0.5">
                          Charisme (CHA)
                        </div>
                        <div className="text-[10px] text-text-muted leading-tight">
                          {t('profile.stats.chaDesc')}
                        </div>
                      </div>
                      <div className="text-xl font-black font-display text-text-secondary select-none">
                        {character.stats.cha}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Form Save Button & Progress Footer */}
            <div className="pt-6 border-t border-gaming-border/60 flex justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary text-white rounded-xl shadow-lg flex items-center gap-2 cursor-pointer font-display font-bold px-6 border-none hover:opacity-90 disabled:bg-gaming-border disabled:text-text-muted transition-all select-none focus:outline-none"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>{t('profile.saving')}</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{t('profile.saveChanges')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
export default ProfilePage;
