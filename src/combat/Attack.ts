export enum AttackType {
  SWORD = 'SWORD',
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

// A playernek EGYETLEN kardtámadása van (projektterv 9. pont): nagy ívű csapás, közepes
// tempó. A korábbi Light/Heavy pár helyére lépett — a nagy ív animációját és hitboxát
// örökölte, de a kisebb (light) sebzést tartotta meg.
//
// A Record szerkezete SZÁNDÉKOSAN megmarad: ha a repertoár később bővül, egy új
// AttackType tag + egy új bejegyzés elég hozzá.
//
// A startupDelayMs + activeDurationMs egyben a támadás ANIMÁCIÓJÁNAK is a hossza
// (PlayerAnimations.ts a frameRate-et ebből számolja), ezért a hangolásuk egyszerre
// gameplay- és animáció-döntés: 330ms / 5 frame = 15 fps, a hitbox a 150ms-os startup
// után (a csapás frame-jén) nyílik.
//
// A cooldownMs szándékosan NEM kisebb az animáció hosszánál (330ms) — különben nem a
// cooldown lenne a valódi kapu, hanem az ATTACK state-lock, és a szám félrevezetővé válna.
//
// A hitbox MÉRETEI a tényleges animáció-kiterjedésből származnak: az Attacks.png aktív
// frame-jeinek (f17-f19) alpha bounding boxa, a player középpontjához viszonyítva — az ív
// +63px-ig ér, ezért a hitbox +9..+59. Ha valaha más frame-tartomány kerül a támadáshoz
// (PlayerAnimations.ts ATTACK_FRAMES), ezt EGYÜTT kell újraszámolni — különben a hitbox
// a kard előtt/mögött a levegőt találja el.
export const ATTACK_CONFIGS: Record<AttackType, AttackConfig> = {
  [AttackType.SWORD]: {
    damage: 10,
    cooldownMs: 350,
    startupDelayMs: 150,
    activeDurationMs: 180,
    hitboxWidth: 50,
    hitboxHeight: 46,
    hitboxOffsetX: 34,
  },
};