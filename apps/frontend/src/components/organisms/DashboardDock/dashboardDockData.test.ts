import { describe, expect, it } from 'vitest';
import { buildGuildCardHands, buildPodiumCards } from './dashboardDockData';

const t = (key: string) => key;

describe('dashboard dock data builders', () => {
  it('builds podium cards from provided guild data only', () => {
    const cards = buildPodiumCards(t, [
      { id: 'guild-low', name: 'Low Guild', gold: 10 },
      { id: 'guild-high', name: 'High Guild', gold: 50 },
      { id: 'guild-mid', name: 'Mid Guild', gold: 25 },
    ]);

    expect(cards.map((card) => card.title)).toEqual(['High Guild', 'Mid Guild', 'Low Guild']);
    expect(cards.map((card) => card.guild?.id)).toEqual(['guild-high', 'guild-mid', 'guild-low']);
  });

  it('builds a partial podium while guild data is still loading', () => {
    const cards = buildPodiumCards(t, [
      { id: 'guild-player', name: 'Solarized Sentinels', gold: 180 },
    ]);

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe('Solarized Sentinels');
    expect(cards[0].ribbonLabel).toBe('#1');
  });

  it('uses real character stats in the player guild hand', () => {
    const [hand] = buildGuildCardHands(t, {
      guild: { id: 'guild-1', name: 'Solarized Sentinels', gold: 180 },
      guildName: 'Solarized Sentinels',
      playerName: 'Lina Morel',
      playerAvatar: '/avatar.png',
      characterClass: 'guide',
      characterClassLabel: 'Guide',
      characterStats: {
        strength: 7,
        dexterity: 16,
        constitution: 0,
        intelligence: 13,
        wisdom: 0,
        charisma: 15,
      },
      activeCardIndex: 0,
    });

    const playerCard = hand.cards.find((card) => card.id === 'player');
    expect(playerCard?.front && 'stats' in playerCard.front ? playerCard.front.stats : []).toEqual([
      { id: 'strength', label: 'STR', value: 7 },
      { id: 'dexterity', label: 'DEX', value: 16 },
      { id: 'intelligence', label: 'INT', value: 13 },
      { id: 'charisma', label: 'CHA', value: 15 },
    ]);
  });
});
