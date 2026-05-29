import { describe, expect, it } from 'vitest';
import { buildGuildCardHands, buildPodiumCards } from './dashboardDockData';

const t = (key: string) => key;

describe('dashboard dock data builders', () => {
  it('builds podium cards from provided guild data only', () => {
    const cards = buildPodiumCards(t, [
      { id: 'guild-low', name: 'Low Guild', gold: 200, boostPointsSpent: 10 },
      { id: 'guild-high', name: 'High Guild', gold: 5, boostPointsSpent: 50 },
      { id: 'guild-mid', name: 'Mid Guild', gold: 100, boostPointsSpent: 25 },
    ]);

    expect(cards.map((card) => getFront(card)?.title?.value)).toEqual(['High Guild', 'Mid Guild', 'Low Guild']);
    expect(cards.map((card) => card.id)).toEqual([
      'class-guild-high-guild-guild',
      'class-guild-mid-guild-guild',
      'class-guild-low-guild-guild',
    ]);
    expect(cards.map((card) => getFront(card)?.subtitle?.value)).toEqual([
      'dashboard.dock.boostPointsSpent',
      'dashboard.dock.boostPointsSpent',
      'dashboard.dock.boostPointsSpent',
    ]);
  });

  it('builds a partial podium while guild data is still loading', () => {
    const cards = buildPodiumCards(t, [
      { id: 'guild-player', name: 'Solarized Sentinels', gold: 180 },
    ]);

    expect(cards).toHaveLength(1);
    expect(getFront(cards[0])?.title?.value).toBe('Solarized Sentinels');
    expect(getFront(cards[0])?.type?.text?.value).toBe('#1');
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
    expect(getFront(playerCard)?.info?.stats?.values).toEqual([
      { id: 'strength', label: 'STR', value: 7 },
      { id: 'dexterity', label: 'DEX', value: 16 },
      { id: 'intelligence', label: 'INT', value: 13 },
      { id: 'charisma', label: 'CHA', value: 15 },
    ]);
  });
});

function getFront(card: ReturnType<typeof buildPodiumCards>[number] | undefined) {
  return card?.model.front && card.model.front !== 'none' ? card.model.front : undefined;
}
