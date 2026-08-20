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
//
// A startupDelayMs + activeDurationMs egyben a támadás ANIMÁCIÓJÁNAK is a hossza
// (PlayerAnimations.ts a frameRate-et ebből számolja), ezért a hangolásuk egyszerre
// gameplay- és animáció-döntés:
//   LIGHT  250ms / 7 frame  = 28 fps, a hitbox a 100ms-os startup után (a vágás frame-jén) nyílik
//   HEAVY  330ms / 5 frame  = 15 fps
export const ATTACK_CONFIGS: Record<AttackType, AttackConfig> = {
  [AttackType.LIGHT]: {
    damage: 10,
    cooldownMs: 300,
    startupDelayMs: 100,
    activeDurationMs: 150,
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