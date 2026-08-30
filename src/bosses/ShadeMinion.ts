import Phaser from 'phaser';
import type { Damageable } from '../combat/DamageSystem';
import type Player from '../player/Player';
import {
  APPEAR_ANIM_MS,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  BODY_WIDTH,
  DEATH_ANIM_MS,
  HALF_HEIGHT,
  HALF_WIDTH,
  ORIGIN_X,
  ORIGIN_Y,
  SCALE,
  SHADE_ANIMS,
  SHADE_TEXTURES,
} from './ShadeMinionAnimations';
import {
  BODY_HEIGHT as PLAYER_BODY_HEIGHT,
  BODY_WIDTH as PLAYER_BODY_WIDTH,
} from '../player/PlayerAnimations';

/**
 * Árnyék-lidérc — az Ancient Demon Phase 2 idézésének a terméke.
 *
 * A démon a harc egyetlen olyan bossa, aki NEM tud gyorsan mozogni (nincs járás-animációja,
 * lásd AncientDemonAnimations). A lidércek pótolják azt a nyomást, ami különben hiányozna:
 * a player nem állhat meg gyógyulni/tölteni, mert az árnyékok közben rásodródnak.
 *
 * SZÁNDÉKOSAN nagyon egyszerű lény, nem egy harmadik enemy-típus:
 *  - nincs state machine (csak APPEARING / ALIVE / DEAD),
 *  - nincs támadás-animációja: ÉRINTÉSRE sebez, és azzal el is pusztul,
 *  - BÁRMEKKORA sebzés megöli (egy kardcsapás, egy tűzgolyó),
 *  - lejár magától, tehát egy elfutó player nem hurcolja végig őket az arénán.
 */
export enum ShadeState {
  /** A megjelenés-animáció ideje: nem sebez és nem sebezhető. */
  APPEARING = 'APPEARING',
  ALIVE = 'ALIVE',
  DEAD = 'DEAD',
}

/** Sodródási sebesség. SZÁNDÉKOSAN jóval a player MOVE_SPEED-je (200) alatt: kikerülhető. */
export const SHADE_SPEED = 70;
export const SHADE_CONTACT_DAMAGE = 8;

/**
 * Meddig él, ha senki nem öli meg. Enélkül egy elfutó player mögött végtelen sorban
 * gyűlnének, és a Phase 2 fokozatosan játszhatatlanná válna.
 */
export const SHADE_LIFETIME_MS = 8000;

/**
 * Kontakt-találat sugara. A két test félméretének összege — tehát a hitbox itt is a
 * GEOMETRIÁBÓL származik, nem szabadon hangolt szám.
 */
export const SHADE_HIT_RANGE_X = HALF_WIDTH + PLAYER_BODY_WIDTH / 2; // 24
export const SHADE_HIT_RANGE_Y = HALF_HEIGHT + PLAYER_BODY_HEIGHT / 2; // 43

export default class ShadeMinion extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public shadeState: ShadeState = ShadeState.APPEARING;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, SHADE_TEXTURES.APPEAR, 0);

    scene.add.existing(this);
    // A setScale MÉG a body létrehozása ELŐTT: az Arcade Body a konstruktorában menti el a
    // game object skáláját (15. technikai tanulság).
    this.setScale(SCALE);
    scene.physics.add.existing(this);

    this.setOrigin(ORIGIN_X, ORIGIN_Y);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    body.setOffset(BODY_OFFSET_X, BODY_OFFSET_Y);
    // A lidérc LEBEG: se gravitáció, se talaj-ütközés. Ezért nem is kap ground collidert a
    // scene-től — egyenes vonalban úszik a player felé, akadály nélkül.
    body.setAllowGravity(false);

    this.play(SHADE_ANIMS.APPEAR);

    // A megjelenés végén válik élővé. A DEAD guard kell: a démon halála (vagy a scene
    // leállása) a megjelenés KÖZBEN is elpusztíthatja.
    scene.time.delayedCall(APPEAR_ANIM_MS, () => {
      if (this.shadeState !== ShadeState.APPEARING) return;
      this.shadeState = ShadeState.ALIVE;
      this.play(SHADE_ANIMS.IDLE);
    });

    scene.time.delayedCall(SHADE_LIFETIME_MS, () => {
      if (this.shadeState === ShadeState.DEAD) return;
      this.die();
    });
  }

  /** A scene minden frame-ben meghívja, átadva a player referenciát. */
  update(player: Player): void {
    if (this.shadeState !== ShadeState.ALIVE) {
      this.setVelocity(0, 0);
      return;
    }

    if (player.isDead()) {
      this.setVelocity(0, 0);
      return;
    }

    // 2D sodródás: a lidérc lebeg, tehát a magasságot is követi — a levegőben lévő player
    // sem ússza meg pusztán azzal, hogy felugrott.
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setVelocity(Math.cos(angle) * SHADE_SPEED, Math.sin(angle) * SHADE_SPEED);

    this.resolveContact(player);
  }

  /**
   * Érintés: egyszer sebez, majd elpusztul. Nem kell hozzá HazardDamageGate (mint a
   * tüskéknél/kaszánál), mert a lidérc a saját találatát nem éli túl — a folyamatos
   * érintkezésből származó frame-enkénti sebzés így fogalmilag lehetetlen.
   */
  private resolveContact(player: Player): void {
    if (
      Math.abs(player.x - this.x) > SHADE_HIT_RANGE_X ||
      Math.abs(player.y - this.y) > SHADE_HIT_RANGE_Y
    ) {
      return;
    }

    player.takeDamage(SHADE_CONTACT_DAMAGE);
    this.die();
  }

  /** BÁRMEKKORA sebzés megöli: egy kardcsapás vagy egy tűzgolyó elég. */
  takeDamage(_amount: number): void {
    if (this.shadeState === ShadeState.DEAD) return;
    this.die();
  }

  private die(): void {
    this.shadeState = ShadeState.DEAD;
    this.setVelocity(0, 0);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    // A haláltusa eventje KIZÁRÓLAG ide kerülhet, a destroy()-ba SOHA (24. technikai
    // tanulság): a destroy() a state-et közvetlenül DEAD-re állítja die() nélkül, a scene
    // pedig a démon halálakor az összes lidércet megsemmisíti.
    this.emit('shade-death', this.x, this.y);

    this.play(SHADE_ANIMS.DEATH);
    // A death sheet utolsó frame-je majdnem üres, tehát nem kell fade — csak a takarítás.
    this.scene.time.delayedCall(DEATH_ANIM_MS, () => this.destroy());
  }

  /**
   * A scene menet közben (a démon halálakor, respawnnál) is megsemmisíthet egy ÉLŐ lidércet,
   * akár a megjelenése közben. A függő delayedCall-ok ettől még lefutnának, ezért a state a
   * super.destroy() ELŐTT DEAD-re áll — az összes callback már eleve ezzel a guarddal indul
   * (18. technikai tanulság).
   */
  override destroy(fromScene?: boolean): void {
    this.shadeState = ShadeState.DEAD;
    super.destroy(fromScene);
  }

  isDead(): boolean {
    return this.shadeState === ShadeState.DEAD;
  }
}
