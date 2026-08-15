export enum AttackType {
  LIGHT = 'LIGHT',
  HEAVY = 'HEAVY',
}

export interface AttackConfig {
  damage: number;
  cooldownMs: number;
  startupDelayMs: number;
  activeDurationMs: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
}

// Light Attack: gyorsabb, kisebb sebzés.
// Heavy Attack: lassabb, nagyobb sebzés. (projektterv 9. pont)
export const ATTACK_CONFIGS: Record<AttackType, AttackConfig> = {
  [AttackType.LIGHT]: {
    damage: 10,
    cooldownMs: 300,
    startupDelayMs: 60,
    activeDurationMs: 120,
    hitboxWidth: 40,
    hitboxHeight: 40,
    hitboxOffsetX: 30,
  },
  [AttackType.HEAVY]: {
    damage: 22,
    cooldownMs: 650,
    startupDelayMs: 150,
    activeDurationMs: 180,
    hitboxWidth: 50,
    hitboxHeight: 46,
    hitboxOffsetX: 34,
  },
};