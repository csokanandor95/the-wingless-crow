import Phaser from 'phaser';

// Egyetlen távoli varázstámadás (projektterv 10. pont) — nincs mana, nincs spell tree.
export const FIREBALL_CONFIG = {
  damage: 15,
  speed: 400,
  cooldownMs: 500,
  lifespanMs: 3000,
};

export default class Fireball extends Phaser.Physics.Arcade.Sprite {
  private damage: number;
  private hasHit = false;

  constructor(scene: Phaser.Scene, x: number, y: number, direction: number) {
    super(scene, x, y, 'fireball-placeholder');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(16, 16);

    this.damage = FIREBALL_CONFIG.damage;
    this.setVelocityX(FIREBALL_CONFIG.speed * direction);
    this.setFlipX(direction < 0);

    scene.time.delayedCall(FIREBALL_CONFIG.lifespanMs, () => {
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