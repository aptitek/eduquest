export const fr = {
  common: {
    loading: 'Chargement...',
    apiSource: 'Source API',
    xp: 'XP',
    level: 'Niveau',
    success: 'Réussi',
    campfire: 'Feu de Camp',
    quest: 'Quête',
    boss: 'Combat de Boss',
  },
  layout: {
    title: 'EduQuest',
    alpha: 'v1.0 (Alpha)',
    tabPlay: '🎮 Jeu',
    tabGm: '🛠️ Dashboard GM',
    footer: 'EduQuest © 2026 — LMS Gamifié Rôle-Play',
    loadingSession: 'Chargement de la session de jeu...',
    loadingMap: 'Génération de la carte interactive...',
  },
  header: {
    reconnecting: 'Reconnexion...',
    checkConnection: 'Vérifier la connexion',
    apprenticeCoder: "L'Apprenti Codeur",
    guildName: 'Mages Frontend',
    guildLabel: 'Guilde',
  },
  map: {
    tooltipLocked: '🔒',
  },
  detailPanel: {
    noSelectedTitle: 'Aucune cible sélectionnée',
    noSelectedDesc:
      'Cliquez sur un nœud déverrouillé de la carte pour afficher sa description et lancer le défi.',
    challengeLink: 'Lien du Défi',
    startBoss: 'Lancer le Combat',
    startQuest: 'Résoudre la Quête',
    completedSuccess: 'Défi accompli avec succès !',
    bossDesc:
      "Affrontez le gardien de ce module pédagogique en soumettant votre livrable final. Les statistiques d'intelligence (INT) sont critiques.",
    questDesc:
      'Explorez cette quête pratique pour maîtriser de nouveaux concepts de programmation.',
    campfireDesc: 'Reposez-vous au coin du feu et suivez la conférence du Maître du Jeu.',
  },
};

export type TranslationKeys = typeof fr;
