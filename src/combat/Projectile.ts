import Phaser from 'phaser';

// Egyetlen távoli varázstámadás (projektterv 10. pont) — nincs mana, nincs spell tree.
//
// A `cooldownMs` a KÉT LÖVÉS KÖZÖTTI RITMUS, nem a fegyver valódi kapuja: azt a lentebbi
// töltet-rendszer adja. A kettő szándékosan külön él — a ritmus a kézérzetért felel, a
// töltet a balanszért.
export const FIREBALL_CONFIG = {
  damage: 15,
  speed: 400,
  cooldownMs: 500,
  lifespanMs: 3000,
};

/**
 * A tűzgolyó EGYIDEJŰLEG elérhető töltetei. A player ennyit lőhet ki sorozatban, utána
 * várnia kell — a `Player.castFireball()` kezeli, lásd ott a visszatöltés modelljét.
 */
export const FIREBALL_MAX_CHARGES = 2;

/**
 * Egy elköltött töltet visszatöltési ideje. Minden töltet a SAJÁT elköltésétől számítva
 * tölt vissza, egymástól függetlenül (nem sorban): két gyors lövés után mindkettő
 * nagyjából egyszerre tér vissza, egy lövés + várakozás + még egy után viszont eltolva.
 *
 * Az 5000 ms LEVEZETETT, nem hangolt:
 *  - fenntartott sebzés `FIREBALL_MAX_CHARGES * damage / rechargeMs` = 2*15/5000 = **6 dps**,
 *    szemben a kard `ATTACK_CONFIGS[SWORD].damage / cooldownMs` = 10/350 = **28,6 dps**-ével.
 *    A tűzgolyó ezzel távolsági ESZKÖZ lett, nem fő fegyver — korábban (500 ms cooldown,
 *    korlátlan lőszer) 30 dps-t adott, tehát a kard FÖLÖTT volt, ráadásul kockázat nélkül.
 *  - egy 40 HP-s CrowHarvester 3 tűzgolyót kíván = egy teli tár + egy visszatöltés ≈ 5,5 s,
 *    miközben a lény a 220 px-es DETECTION_RANGE-ét 100 px/s-mal ~2,2 s alatt teszi meg.
 *    A tisztán távolsági megölés tehát KÉTSZER annyi ideig tart, mint amennyi alatt a lény
 *    beér — vagyis nem stratégia többé, csak nyitány vagy befejezés.
 *
 * *(Első nekifutásra 3000 volt; kézi teszten a user szerint még mindig túl bőkezű. A
 * 2 lövéses BURST szándékosan változatlan — a nyomásnak a sorozat UTÁN kell jönnie.)*
 *
 * Ez a szám az elsődleges hangolópont, ha a távolsági harc túl gyengének/erősnek bizonyul.
 */
export const FIREBALL_RECHARGE_MS = 5000;

const DEFAULT_TEXTURE = 'fireball-placeholder';
const DEFAULT_SIZE = 16;

/**
 * A boss lövedéke ugyanez a mechanika (sebesség, lifespan, onImpact villanás+tween,
 * egyszeri-találat gate), csak más textúrával/számokkal — ezért nem külön osztály,
 * hanem ez az opcionális felülírás. Minden mező elhagyható: a default-ok a
 * FIREBALL_CONFIG-ból jönnek, így a meglévő `new Fireball(scene, x, y, dir)` hívások
 * viselkedése változatlan.
 */
export interface ProjectileOptions {
  texture?: string;
  damage?: number;
  speed?: number;
  lifespanMs?: number;
  /** A négyzetes physics body oldalhossza. */
  size?: number;
}

export default class Fireball extends Phaser.Physics.Arcade.Sprite {
  private damage: number;
  private hasHit = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: number,
    options: ProjectileOptions = {}
  ) {
    super(scene, x, y, options.texture ?? DEFAULT_TEXTURE);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const size = options.size ?? DEFAULT_SIZE;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(size, size);

    this.damage = options.damage ?? FIREBALL_CONFIG.damage;
    this.setVelocityX((options.speed ?? FIREBALL_CONFIG.speed) * direction);
    this.setFlipX(direction < 0);

    scene.time.delayedCall(options.lifespanMs ?? FIREBALL_CONFIG.lifespanMs, () => {
      this.destroyProjectile();
    });
  }

  getDamage(): number {
    return this.damage;
  }

  hasAlreadyHit(): boolean {
    return this.hasHit;
  }

  // Becsapódás: sebesség leáll, rövid villanás + fade-out, majd destroy.
  // Valódi impact particle effect Phase 8-ban.
  onImpact(): void {
    if (this.hasHit) return;
    this.hasHit = true;
    this.setVelocity(0, 0);
    this.setTint(0xffffff);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 1.5,
      duration: 120,
      onComplete: () => this.destroyProjectile(),
    });
  }

  private destroyProjectile(): void {
    this.destroy();
  }
}