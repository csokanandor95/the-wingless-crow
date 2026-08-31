import type Phaser from 'phaser';
import CrowHarvester from '../enemies/CrowHarvester';
import Gravecaller, {
  PROJECTILE_DAMAGE as GRAVECALLER_PROJECTILE_DAMAGE,
  PROJECTILE_SIZE as GRAVECALLER_PROJECTILE_SIZE,
  PROJECTILE_SPEED as GRAVECALLER_PROJECTILE_SPEED,
} from '../enemies/Gravecaller';
import Beast from '../enemies/Beast';
import Fireball from '../combat/Projectile';
import type Player from '../player/Player';
import type { Damageable } from '../combat/DamageSystem';
import AudioManager, {
  BEAST_DEATH_VOLUME,
  DEATH_SFX_DETUNE_RANGE,
  GRAVECALLER_DEATH_VOLUME,
  HARVESTER_DEATH_VOLUME,
  SFX_KEYS,
} from '../systems/AudioManager';
import {
  FALL_DEATH_Y,
  enemyChaseBounds,
  enemySpawnOffset,
  enemyType,
  surfaceSpan,
  type EnemySpawnDef,
  type LevelGeometry,
} from './LevelGeometry';

/**
 * A pályák enemy-blokkja EGY helyen: spawnolás, respawn-reset, frissítés, és a lények
 * lövedékei.
 *
 * **Miért került ki (user-döntés, a `Level2Scene` fejlécének „Level 3-nál újranézzük"
 * megjegyzésére):** ez a blokk a `Level1Scene`-ben és a `Level2Scene`-ben SZÓ SZERINT azonos
 * volt, két különbséggel — a Level 1 nem ismerte a `'beast'` ágat, és a `LevelEnemy`
 * interfész mindkét scene-ben külön volt deklarálva. A scene-VÁZ továbbra is másolat marad
 * (arra nincs unit teszt, tehát a kiemelése csak kézi végigjátszással lenne validálható);
 * ami kikerült, az a mechanikus és tesztelhető rész.
 *
 * **Mellékhaszon:** a `Level1Scene` eddig NÉMÁN CrowHarvestert szült volna egy oda felvett
 * `type: 'beast'` sorra, és ezt csak egy unit teszt zárta ki. Innentől mindkét pálya minden
 * típust ismer, tehát a tiltás — és a hozzá tartozó teszt — okafogyottá vált.
 *
 * ## A tömbök IDENTITÁSA
 *
 * A négy tömb `readonly`, és soha nem cserélődik ki: a `reset()` `splice` + `push`-sal
 * dolgozik. A scene-ek `physics.add.collider/overlap` hívásai ezekre a REFERENCIÁKRA
 * kötődnek, és a Phaser minden physics stepben újraiterálja a tartalmukat — egy `filter()`-es
 * újra-értékadás elavult tömbre hagyná a collidert (CLAUDE.md 2. tanulság).
 *
 * A példány maga scene-enként, a `create()`-ben jön létre, tehát a CLAUDE.md 3. tanulsága
 * (class field initializerek scene-restartkor) itt automatikusan rendben van: nem kell a
 * tömböket kézzel üríteni a `create()` elején.
 */

/** Amit a pálya EGY enemytől elvár, típustól függetlenül. */
export interface LevelEnemy extends Damageable {
  readonly y: number;
  getMaxHP(): number;
  update(player: Player): void;
}

/**
 * A séta- és üldözési határok. Mindhárom lény konfigurációja AZONOS ALAKÚ
 * (`CrowHarvesterConfig` ≡ `GravecallerConfig` ≡ `BeastConfig`), ezért egyetlen típussal
 * mindhármuk konstruktora kiszolgálható — a strukturális tipizálás miatt nem kell közös ős.
 */
interface EnemyBounds {
  patrolMinX: number;
  patrolMaxX: number;
  chaseMinX: number;
  chaseMaxX: number;
}

export default class LevelEnemies {
  /** Enemy 1 — közelharci sétáló. */
  readonly harvesters: CrowHarvester[] = [];
  /** Enemy 2 — álló lövő. */
  readonly gravecallers: Gravecaller[] = [];
  /** Enemy 3 — rohamozó. */
  readonly beasts: Beast[] = [];
  /**
   * A Gravecallerek boltjai. SZÁNDÉKOSAN külön a player tűzgolyóitól: ezek a PLAYERT sebzik,
   * tehát más overlap-regisztrációt kapnak (a `BossScene.bossProjectiles` mintája).
   */
  readonly projectiles: Fireball[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spawns: EnemySpawnDef[],
    private readonly geometry: LevelGeometry,
    private readonly audio: AudioManager
  ) {}

  /**
   * A négy collider-regisztrációhoz: mindhárom fajta UGYANAZT kapja, mert a scene handlerei
   * csak a `Damageable` felületet használják, tehát típusfüggetlenek.
   */
  groups(): Phaser.Physics.Arcade.Sprite[][] {
    return [this.harvesters, this.gravecallers, this.beasts];
  }

  /**
   * A séta-körzet (`patrolMinX/MaxX`) és az ÜLDÖZÉSI határ két külön dolog: az előbbi az
   * `ENEMY_SPAWNS` adata, az utóbbit az `enemyChaseBounds()` VEZETI LE a felület pereméből és
   * a spike-mezőkből. A spawn Y talp-offsetje szintén levezetett, típusonként.
   */
  spawn(): void {
    for (const def of this.spawns) {
      const surface = surfaceSpan(this.geometry, def.surfaceId);
      const chase = enemyChaseBounds(def, this.geometry);
      // Mindhárom lény konfigurációja AZONOS ALAKÚ (GravecallerConfig ≡ CrowHarvesterConfig
      // ≡ BeastConfig), csak a spawn Y talp-offsetje típusfüggő.
      const bounds: EnemyBounds = {
        patrolMinX: def.patrolMinX,
        patrolMaxX: def.patrolMaxX,
        chaseMinX: chase.min,
        chaseMaxX: chase.max,
      };
      const spawnY = surface.top - enemySpawnOffset(def);

      switch (enemyType(def)) {
        case 'gravecaller':
          this.gravecallers.push(this.createGravecaller(def, spawnY, bounds));
          break;
        case 'beast':
          this.beasts.push(this.createBeast(def, spawnY, bounds));
          break;
        default:
          this.harvesters.push(this.createHarvester(def, spawnY, bounds));
      }
    }
  }

  private createGravecaller(
    def: EnemySpawnDef,
    spawnY: number,
    bounds: EnemyBounds
  ): Gravecaller {
    const caster = new Gravecaller(this.scene, def.x, spawnY, bounds);

    // A lövedéket a PÁLYA hozza létre (mint a player 'fireball-cast'-jánál és a boss
    // 'boss-projectile'-jánál) — a Gravecaller csak a helyet és az irányt emittálja.
    caster.on('gravecaller-projectile', (x: number, y: number, direction: number) => {
      this.projectiles.push(
        new Fireball(this.scene, x, y, direction, {
          texture: 'gravecaller-projectile-placeholder',
          damage: GRAVECALLER_PROJECTILE_DAMAGE,
          speed: GRAVECALLER_PROJECTILE_SPEED,
          size: GRAVECALLER_PROJECTILE_SIZE,
        })
      );
      this.audio.playSfx(SFX_KEYS.GRAVECALLER_CAST);
    });

    // A haláltusa a `die()`-ból jön, NEM a `destroy()`-ból — így a `reset()` (ami minden
    // respawnnál MINDEN lényt megsemmisít) néma marad (CLAUDE.md 24. tanulság).
    caster.on('gravecaller-death', () =>
      this.audio.playSfx(SFX_KEYS.GRAVECALLER_DEATH, {
        volume: GRAVECALLER_DEATH_VOLUME,
        detuneRange: DEATH_SFX_DETUNE_RANGE,
      })
    );

    return caster;
  }

  private createBeast(def: EnemySpawnDef, spawnY: number, bounds: EnemyBounds): Beast {
    const beast = new Beast(this.scene, def.x, spawnY, bounds);

    // A közelharci csapás a KÖZÖS `ENEMY_SWING` hangot kapja (mint a CrowHarvester és a
    // bossok) — a ±120 cent detune-szórás miatt a sorozat így sem válik gépiessé.
    beast.on('beast-attack', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));
    // A rohamnak SZÁNDÉKOSAN nincs hangja: a csomagokban nincs hozzá illő, és a
    // Wing-Breaker charge-a is néma. A telegraph vizuális (piros tint + megtámasztott póz).
    beast.on('beast-death', () =>
      this.audio.playSfx(SFX_KEYS.BEAST_DEATH, {
        volume: BEAST_DEATH_VOLUME,
        detuneRange: DEATH_SFX_DETUNE_RANGE,
      })
    );

    return beast;
  }

  private createHarvester(
    def: EnemySpawnDef,
    spawnY: number,
    bounds: EnemyBounds
  ): CrowHarvester {
    const enemy = new CrowHarvester(this.scene, def.x, spawnY, bounds);

    // Csapás-hang. Távolság-alapú némítás NEM kell: a CrowHarvester csak ATTACK_RANGE-en
    // (42px) belül támad, tehát egy csapkodó lény definíció szerint a player mellett áll,
    // és mindig a képernyőn van.
    enemy.on('harvester-attack', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));
    enemy.on('harvester-death', () =>
      this.audio.playSfx(SFX_KEYS.HARVESTER_DEATH, {
        volume: HARVESTER_DEATH_VOLUME,
        detuneRange: DEATH_SFX_DETUNE_RANGE,
      })
    );

    return enemy;
  }

  /**
   * A player halálakor az enemyk is újraélednek — így egy szakaszt nem lehet ismételt
   * halálokkal „lekoptatni".
   *
   * A tömbök IDENTITÁSA nem változhat (lásd az osztály fejlécét): `splice` + `push`.
   */
  reset(): void {
    for (const group of this.groups()) {
      for (const enemy of group) {
        enemy.destroy();
      }
      group.splice(0, group.length);
    }
    this.spawn();
  }

  /** Ugyanaz a helyben-csere: a lövedék-colliderek is a tömb REFERENCIÁJÁRA kötnek. */
  clearProjectiles(): void {
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles.splice(0, this.projectiles.length);
  }

  update(player: Player): void {
    for (const group of this.groups()) {
      this.updateGroup(group as unknown as LevelEnemy[], player);
    }
  }

  private updateGroup(enemies: LevelEnemy[], player: Player): void {
    for (const enemy of enemies) {
      // Biztosíték: a patrol-határok ezt elvileg kizárják, de egy szakadékba került enemy
      // enélkül némán „patrolozna" a világ alján, a képernyőn kívül.
      if (!enemy.isDead() && enemy.y > FALL_DEATH_Y) {
        enemy.takeDamage(enemy.getMaxHP());
        continue;
      }
      enemy.update(player);
    }
  }
}
