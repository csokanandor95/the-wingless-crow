import Phaser from 'phaser';

// Egyetlen távoli varázstámadás (projektterv 10. pont) — nincs mana, nincs spell tree.
export const FIREBALL_CONFIG = {
  damage: 15,
  speed: 400,
  cooldownMs: 500,
  lifespanMs: 3000,
};

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