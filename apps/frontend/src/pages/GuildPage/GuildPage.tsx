import { useEffect, useMemo, useState } from 'react';
import type { Guild, GuildInvitation } from '@eduquest/shared';
import { Plus, Send, Users } from 'lucide-react';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import {
  buildClassGuildHand,
  getLatestCohortMembership,
} from '../../components/organisms/DashboardDock/dashboardDockData';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { HoldToConfirmButton } from '../../components/atoms/HoldToConfirmButton';
import { PlayingCard, PlayingHandPanel } from '../../components/molecules/PlayingCard';
import {
  createGuild,
  fetchClassRoster,
  inviteToGuild,
  joinGuild,
  type ClassRosterGuild,
  type ClassRosterStudent,
} from '../../features/game/api';
import { uploadAsset } from '../../features/assets/api';
import { ApiClientError } from '../../features/errors/api';
import { useErrorReporter } from '../../features/errors/notifications';

export function GuildPage() {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const { student, character, selectedGameId, setStudentGuild } = useGameStore();
  const [guilds, setGuilds] = useState<ClassRosterGuild[]>([]);
  const [invitableStudents, setInvitableStudents] = useState<ClassRosterStudent[]>([]);
  const [guildedStudents, setGuildedStudents] = useState<ClassRosterStudent[]>([]);
  const [invitations, setInvitations] = useState<GuildInvitation[]>([]);
  const [currentGuildId, setCurrentGuildId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [createGuildName, setCreateGuildName] = useState('');
  const [guildDescription, setGuildDescription] = useState('');
  const [guildIllustrationUrl, setGuildIllustrationUrl] = useState('');
  const [guildIconKey, setGuildIconKey] = useState('shield');
  const [guildColor, setGuildColor] = useState('var(--color-solarized-orange)');

  const latestMembership =
    (selectedGameId &&
      student?.cohortMemberships?.find((membership) => membership.cohortId === selectedGameId)) ||
    getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = guilds.find((guild) => guild.id === currentGuildId) || latestMembership?.guild;
  const playerGuildMemberCount = playerGuild ? guilds.find((guild) => guild.id === playerGuild.id)?.members?.length || 0 : 0;
  const pendingGuildInvitations = invitations.filter(
    (invitation) => invitation.status === 'pending' && invitation.guildId === playerGuild?.id
  );
  const pendingGuildInviteeIds = useMemo(
    () => new Set(pendingGuildInvitations.map((invitation) => invitation.inviteeUserId)),
    [pendingGuildInvitations]
  );
  const joinableGuilds = useMemo(
    () =>
      guilds
        .filter((guild) => guild.id !== (currentGuildId || playerGuild?.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [guilds, currentGuildId, playerGuild?.id]
  );

  const loadRoster = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const roster = await fetchClassRoster(token, selectedGameId);
      setGuilds(roster.guilds);
      setInvitableStudents(roster.invitableStudents);
      setGuildedStudents(roster.guildedStudents);
      setInvitations(roster.invitations);
      setCurrentGuildId(roster.currentGuildId);
    } catch (error) {
      reportError(error, {
        messageKey: 'guild.errors.loadRecruitment',
        id: 'guild.errors.loadRecruitment',
        logMessage: 'Could not load guild recruitment.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [selectedGameId]);

  const persistGuildSelection = (guild: Guild) => {
    setCurrentGuildId(guild.id);
    if (guild.cohortId) setStudentGuild(guild.cohortId, guild);
  };

  if (!student || !character) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-text-muted">
        {t('layout.loadingSession')}
      </div>
    );
  }

  const handleCreateGuild = async () => {
    if (submitting === 'create') return;
    const name = createGuildName.trim();
    if (!name) return;
    setSubmitting('create');
    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const guild = await createGuild(
        token,
        {
          name,
          description: guildDescription.trim() || undefined,
          iconUrl: guildIllustrationUrl.trim() || undefined,
          iconKey: guildIconKey.trim() || undefined,
          color: guildColor,
          recruitmentStatus: 'open',
        },
        selectedGameId
      );
      setCreateGuildName('');
      setGuildDescription('');
      setGuildIllustrationUrl('');
      setGuildIconKey('shield');
      setGuildColor('var(--color-solarized-orange)');
      persistGuildSelection(guild);
      await loadRoster();
    } catch (error) {
      reportError(error, {
        messageKey: 'guild.errors.create',
        id: 'guild.errors.create',
        logMessage: 'Could not create guild.',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const uploadGuildIllustration = async (file: File) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) throw new Error('Missing session token.');

    const asset = await uploadAsset(token, 'guild-icon', file);
    setGuildIllustrationUrl(asset.url);
    return asset.url;
  };

  const handleJoinGuild = async (guild: ClassRosterGuild) => {
    setSubmitting(`join:${guild.id}`);
    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      const updatedGuild = await joinGuild(token, guild.id);
      persistGuildSelection({ ...guild, ...updatedGuild });
      await loadRoster();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        await loadRoster();
        return;
      }

      reportError(error, {
        messageKey: 'guild.errors.join',
        id: 'guild.errors.join',
        logMessage: 'Could not join guild.',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleInvite = async (inviteeUserId: string) => {
    if (!playerGuild) return;
    setSubmitting(`invite:${inviteeUserId}`);
    try {
      const token = localStorage.getItem('eduquest_token');
      if (!token) throw new Error('Missing session token.');
      await inviteToGuild(token, playerGuild.id, { inviteeUserId });
      await loadRoster();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        await loadRoster();
        return;
      }

      reportError(error, {
        messageKey: 'guild.errors.invite',
        id: 'guild.errors.invite',
        logMessage: 'Could not invite student.',
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <GameLayout>
      <GameHeader currentView="guild" />

      <div className="space-y-6">
        <h2 className="sr-only">{t('guild.title')}</h2>
        <section className="rounded-3xl border border-gaming-border bg-gaming-card/70 p-6 shadow-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-status-quest">
                {playerGuild ? 'Guilde actuelle' : 'Recrutement'}
              </p>
              <h3 className="mt-1 font-display text-2xl font-black text-text-primary">
                {playerGuild ? playerGuild.name : 'Trouve ta guilde'}
              </h3>
              {playerGuild ? (
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {playerGuildMemberCount.toString()} / {(playerGuild.maxMembers || 3).toString()} membres
                </p>
              ) : (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">
                  Crée une guilde ou rejoins une guilde ouverte. Si tu en choisis une autre, tu quittes
                  automatiquement ta guilde actuelle.
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              {loading ? (
                <span className="rounded-full border border-gaming-border px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
                  {t('common.loading')}
                </span>
              ) : null}
            </div>
          </div>
          {playerGuild ? (
            <section
              aria-label={t('guild.subtitle').replace('{guildName}', playerGuild.name || t('dashboard.dock.playerGuild'))}
              className="mt-6 overflow-visible rounded-3xl border border-gaming-border bg-gaming-base/40 p-2 shadow-2xl md:p-4"
            >
              <div id="guild-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
            </section>
          ) : null}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col items-center gap-4">
            <PlayingCard
              size="full"
              kind="guild"
              editable
              ribbonEditable
              color={guildColor}
              onColorChange={setGuildColor}
              title={createGuildName || 'Nom de ta guilde'}
              subtitle="Guilde ouverte"
              description={
                guildDescription ||
                'Ajoute une courte annonce pour donner envie aux autres élèves de te rejoindre.'
              }
              illustrationUrl={guildIllustrationUrl}
              illustrationAlt={createGuildName || 'Illustration de guilde'}
              ribbonIconKey={guildIconKey}
              className="max-w-xs"
              onFieldChange={(field, value) => {
                if (field === 'title') setCreateGuildName(value.slice(0, 80));
                if (field === 'description') setGuildDescription(value.slice(0, 400));
                if (field === 'illustrationUrl') setGuildIllustrationUrl(value.slice(0, 2000));
                if (field === 'ribbonIcon') setGuildIconKey(value.slice(0, 80));
              }}
              front={{
                title: createGuildName || 'Nom de ta guilde',
                subtitle: 'Guilde ouverte',
                description:
                  guildDescription ||
                  'Ajoute une courte annonce pour donner envie aux autres élèves de te rejoindre.',
                illustrationUrl: guildIllustrationUrl,
                illustrationAlt: createGuildName || 'Illustration de guilde',
                ribbonIconKey: guildIconKey,
                color: guildColor,
                editable: true,
                ribbonEditable: true,
                onColorChange: setGuildColor,
                onIllustrationUpload: uploadGuildIllustration,
                illustrationUploadErrorMessageKey: 'guild.errors.illustrationUpload',
                onFieldChange: (field, value) => {
                  if (field === 'title') setCreateGuildName(value.slice(0, 80));
                  if (field === 'description') setGuildDescription(value.slice(0, 400));
                  if (field === 'illustrationUrl') setGuildIllustrationUrl(value.slice(0, 2000));
                  if (field === 'ribbonIcon') setGuildIconKey(value.slice(0, 80));
                },
              }}
            />
            <div className="flex items-center">
              <HoldToConfirmButton
                onConfirm={handleCreateGuild}
                holdDuration={1200}
                disabled={!createGuildName.trim() || submitting === 'create'}
                variant="btn-primary"
                shape="round"
                className="h-16 w-16"
                aria-label="Créer et rejoindre la guilde"
                title="Créer / Rejoindre"
              >
                <Plus size={28} aria-hidden />
              </HoldToConfirmButton>
            </div>
          </div>

          <section className="rounded-3xl border border-gaming-border bg-gaming-card/70 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Users size={18} className="text-status-quest" aria-hidden />
              <h3 className="font-display text-lg font-black text-text-primary">Guildes disponibles</h3>
            </div>
            <div className="space-y-6">
              {joinableGuilds.length > 0 ? (
                joinableGuilds.map((guild) => {
                  const memberCount = guild.members?.length || 0;
                  const isOpen = guild.recruitmentStatus !== 'closed' && guild.recruitmentStatus !== 'invite_only';
                  const isFull = memberCount >= (guild.maxMembers || 3);
                  const hand = buildClassGuildHand(t, {
                    guild,
                    layoutPrefix: `guild-recruitment-${guild.id}`,
                  });

                  return (
                    <PlayingHandPanel
                      key={guild.id}
                      hand={hand}
                      className="bg-gaming-card/70"
                      handClassName="h-[30rem] md:h-[32rem]"
                      badges={
                        <div className="flex items-center gap-2">
                          <HoldToConfirmButton
                            onConfirm={() => handleJoinGuild(guild)}
                            holdDuration={1200}
                            disabled={!isOpen || isFull || submitting === `join:${guild.id}`}
                            variant="btn-primary"
                            shape="round"
                            className="h-14 w-14 border-primary/40 bg-primary text-primary-content shadow-glow-primary"
                            aria-label={playerGuild ? `Changer pour ${guild.name}` : `Rejoindre ${guild.name}`}
                            title={playerGuild ? 'Changer de guilde' : 'Rejoindre'}
                          >
                            <span className="relative inline-flex">
                              <Users size={24} aria-hidden />
                              <Plus
                                size={14}
                                aria-hidden
                                className="absolute -bottom-2 -right-2 rounded-full bg-primary-content p-0.5 text-primary"
                              />
                            </span>
                          </HoldToConfirmButton>
                          <span className="font-display text-xs font-black uppercase tracking-[0.14em] text-status-quest">
                            {playerGuild ? 'Changer' : 'Rejoindre'}
                          </span>
                        </div>
                      }
                    />
                  );
                })
              ) : (
                <div className="flex justify-center">
                  <PlayingCard
                    size="full"
                    kind="guild"
                    faceDown
                    accentToken="neutral"
                    title="Aucune guilde"
                    ribbonIconKey="shield"
                    interactive={false}
                    className="max-w-xs"
                  />
                </div>
              )}
            </div>
          </section>
        </div>

        {playerGuild ? (
          <section className="rounded-3xl border border-gaming-border bg-gaming-card/70 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Send size={18} className="text-status-campfire" aria-hidden />
              <h3 className="font-display text-lg font-black text-text-primary">Inviter des élèves</h3>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {invitableStudents.length > 0 ? (
                invitableStudents.map((candidate) => {
                  const isInviting = submitting === `invite:${candidate.userId}`;
                  const hasPendingInvitation = pendingGuildInviteeIds.has(candidate.userId);
                  return (
                    <div key={candidate.userId} className="flex flex-col items-center gap-2">
                      <PlayingCard
                        {...buildInviteStudentCard(t, candidate, hasPendingInvitation)}
                        size="full"
                        interactive={!hasPendingInvitation}
                        onClick={() => {
                          if (!isInviting && !hasPendingInvitation) handleInvite(candidate.userId);
                        }}
                        className={isInviting || hasPendingInvitation ? 'max-w-xs opacity-60' : 'max-w-xs'}
                      />
                      {hasPendingInvitation ? (
                        <span className="rounded-full border border-gaming-border bg-gaming-base px-3 py-1 font-display text-xs font-black uppercase tracking-[0.14em] text-text-muted">
                          Invitation en attente
                        </span>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-dashed border-gaming-border p-6 text-center text-sm text-text-muted md:col-span-3">
                  Aucun élève à inviter pour le moment.
                </p>
              )}
            </div>
            {pendingGuildInvitations.length > 0 ? (
              <p className="mt-4 text-xs text-text-muted">
                {pendingGuildInvitations.length} invitation(s) en attente.
              </p>
            ) : null}
            {guildedStudents.length > 0 ? (
              <div className="mt-6 border-t border-gaming-border pt-5">
                <h4 className="font-display text-sm font-black uppercase tracking-[0.16em] text-text-muted">
                  Déjà dans une guilde
                </h4>
                <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {guildedStudents.map((candidate) => (
                    <div key={candidate.userId} className="flex flex-col items-center gap-2">
                      <PlayingCard
                        {...buildInviteStudentCard(t, candidate, true)}
                        size="full"
                        interactive={false}
                        className="max-w-xs opacity-60"
                      />
                      <span className="rounded-full border border-gaming-border bg-gaming-base px-3 py-1 font-display text-xs font-black uppercase tracking-[0.14em] text-text-muted">
                        {candidate.guildName ? `Membre de ${candidate.guildName}` : 'Déjà dans une guilde'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

      </div>
    </GameLayout>
  );
}

function buildInviteStudentCard(
  t: (path: string) => string,
  candidate: ClassRosterStudent,
  hasPendingInvitation = false
) {
  const characterClass = candidate.characterClass || 'scholar';
  const classLabel = t(`game.classes.${characterClass}`);
  const subtitle = candidate.guildName
    ? `Guilde: ${candidate.guildName}`
    : candidate.institutionalEmail || candidate.email || classLabel;
  const stats = candidate.stats;
  const description = candidate.guildName
    ? `Déjà membre de ${candidate.guildName}.`
    : hasPendingInvitation
      ? 'Invitation déjà envoyée.'
      : 'Cliquer pour inviter dans la guilde.';

  return {
    kind: 'character' as const,
    characterClass,
    accentToken: characterClass,
    title: candidate.displayName,
    subtitle,
    illustrationUrl: candidate.characterIllustrationUrl || candidate.avatarUrl,
    illustrationAlt: candidate.displayName,
    ribbonText: classLabel,
    front: {
      title: candidate.displayName,
      subtitle,
      description,
      illustrationUrl: candidate.characterIllustrationUrl || candidate.avatarUrl,
      illustrationAlt: candidate.displayName,
      ribbonText: classLabel,
      stats: stats
        ? [
            { id: 'strength', label: 'STR', value: stats.strength, max: 5 },
            { id: 'dexterity', label: 'DEX', value: stats.dexterity, max: 5 },
            { id: 'constitution', label: 'CON', value: stats.constitution, max: 5 },
            { id: 'intelligence', label: 'INT', value: stats.intelligence, max: 5 },
            { id: 'wisdom', label: 'WIS', value: stats.wisdom, max: 5 },
            { id: 'charisma', label: 'CHA', value: stats.charisma, max: 5 },
          ]
        : undefined,
    },
  };
}

export default GuildPage;
