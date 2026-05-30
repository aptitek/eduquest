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
    expect(cards.map((card) => getFront(card)?.type?.icon?.value)).toEqual(['Trophy', 'Trophy', 'Trophy']);
  });

  it('keeps the podium empty until a guild has spent boost points', () => {
    const cards = buildPodiumCards(t, [
      { id: 'guild-player', name: 'Solarized Sentinels', gold: 180 },
      { id: 'guild-zero', name: 'Zero Guild', gold: 120, boostPointsSpent: 0 },
    ]);

    expect(cards).toEqual([]);
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
      { id: 'strength', label: 'STR', value: 7, max: 5 },
      { id: 'dexterity', label: 'DEX', value: 16, max: 5 },
      { id: 'constitution', label: 'CON', value: 0, max: 5 },
      { id: 'intelligence', label: 'INT', value: 13, max: 5 },
      { id: 'wisdom', label: 'WIS', value: 0, max: 5 },
      { id: 'charisma', label: 'CHA', value: 15, max: 5 },
    ]);
  });
});

function getFront(card: ReturnType<typeof buildPodiumCards>[number] | undefined) {
  return card?.model.front && card.model.front !== 'none' ? card.model.front : undefined;
}
