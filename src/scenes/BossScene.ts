import Phaser from 'phaser';
import Player from '../player/Player';
import PlayerController from '../player/PlayerController';
import Fireball from '../combat/Projectile';
import GraftedWingBreaker, {
  BossState,
  PROJECTILE_DAMAGE,
  PROJECTILE_SPEED,
} from '../bosses/GraftedWingBreaker';
import {
  FEET_OFFSET_Y as BOSS_FEET_OFFSET_Y,
  SCALE as BOSS_SCALE,
  SPELL_IMPACT_MS,
  SPELL_ORIGIN_X,
  SPELL_ORIGIN_Y,
  TEXTURE_KEY as BOSS_TEXTURE_KEY,
  WING_BREAKER_ANIMS,
} from '../bosses/GraftedWingBreakerAnimations';
import type { PhysicsOverlapObject } from '../combat/DamageSystem';
import AudioManager, { bindPlayerSfx, MUSIC_KEYS, SFX_KEYS } from '../systems/AudioManager';
import AfterImageTrail from '../systems/AfterImageTrail';
import { BACKGROUND_TEXTURES } from '../systems/ParallaxBackground';
import Dialogue, { type DialogueLine } from '../ui/Dialogue';

// Boss aréna (Project_plan.md 15. pont): fix, egy képernyős pálya — nincs kameragörgetés,
// így a boss, a player és a HP-bar mindig egyszerre látszik, és a charge/projectile
// telegraph mindig olvasható marad.
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 450;

/**
 * A rajzolt katedrális-padló felső pereme. **418 volt, és 369 lett** (2026-09-01), amikor az
 * aréna párbeszédet kapott: a `ui/Dialogue` panelje a járható felszín ALÁ ül és
 * `PANEL_RESERVE_PX` (75) px-t foglal, tehát `GROUND_TOP + 75 <= 450` a kényszer —
 * 418-cal a panel kilógott volna a képből.
 *
 * Ezzel MIND A NÉGY párbeszédes aréna padlóvonala 369. A háttér ehhez ÚJRAGENERÁLÓDOTT
 * (a képlet a BootScene importjánál); a padlóél a 800x450-es PNG-n visszamérve a 370. sorban
 * csúcsosodik ki (118,4), a felfutás a 369.-ben kezdődik — pontosan úgy, ahogy a régi,
 * 418-as változatban is egy sorral a GROUND_TOP alatt volt.
 */
const GROUND_TOP = 369;
const GROUND_CENTER_Y = GROUND_TOP + 16; // ground-placeholder 64x32, origin 0.5

// Az aréna szélén, hogy a boss (aki jobb oldalt spawnol) és a player között legyen távolság.
const PLAYER_SPAWN_X = 80;
const PLAYER_SPAWN_Y = 300;

// A boss sprite talpa a sprite.y-tól BOSS_FEET_OFFSET_Y-ra van (a sprite geometriájából
// levezetve, lásd GraftedWingBreakerAnimations.ts) — így a spawn pontosan a talajra teszi.
const BOSS_SPAWN_X = 620;
const BOSS_SPAWN_Y = GROUND_TOP - BOSS_FEET_OFFSET_Y;

// Az aréna ÜRES: nincs lebegő platform. A charge elől vízszintesen kitérve vagy a roham
// fölött átugorva lehet menekülni, a Shadow Spell elől pedig oldalra lépve — mindkettőhöz
// tiszta, akadálymentes padló kell, és így a 108px magas boss sem akadhat platformba.

// A háttér 800x450-es, tehát 1:1-ben, skálázás nélkül fedi az arénát. A tint egy enyhe
// sötétítés (0xb0 = 69%): a nyers festmény olyan világos és részletgazdag, hogy elnyomná
// a bosst és különösen a charge PIROS telegraph-ját — ami korábban egy majdnem fekete
// (#100810) háttéren villant. Ez az egyetlen hangolópont, ha világosabb/sötétebb kell.
const BACKGROUND_TINT = 0xb0b0b0;

const BOSS_NAME = 'The Grafted Wing-Breaker';

const HP_BAR_X = 110;
const HP_BAR_Y = 34;
const HP_BAR_WIDTH = 580;
const HP_BAR_HEIGHT = 16;

const VICTORY_DELAY_MS = 1400;
const DEFEAT_DELAY_MS = 1400;
const FADE_MS = 700;

/**
 * Placeholder lore-párbeszéd: a végleges szöveget a Phase 9 – Lore írja meg, a csere ennek a
 * tömbnek a szerkesztése. A tartalom a Project_plan.md 12. pontját követi (a Wing-Breaker a
 * varjak fogvatartója, a testéhez varrt szárnyakkal), és előrevetíti a királyt: a tűt ő adta.
 *
 * A sorok SZÁNDÉKOSAN rövidek: a panel 2 sorra tördel, ennél hosszabb szöveg kilógna belőle.
 * NÉGY sor — a többi bossnál hat —, mert ez a játék ELSŐ harca: itt még nincs mit felidézni.
 */
const WING_BREAKER_DIALOGUE: DialogueLine[] = [
  { speaker: 'A SZÁRNYTÖRŐ', text: 'Szárnyatlan. Végre. A tieid itt lógnak a hátamon.' },
  { speaker: 'LAZARUS', text: 'Azok nem a te szárnyaid. Levarrtad őket, mert magadnak nem nőtt.' },
  { speaker: 'A SZÁRNYTÖRŐ', text: 'A király adta a tűt. Én csak begyűjtöm, ami a kapun kirepül.' },
  { speaker: 'LAZARUS', text: 'Akkor tedd le. Vagy leszedem rólad.' },
];

// Placeholder lore-szöveg: a végleges narrációt a Phase 9 – Lore írja meg,
// a csere ennek a tömbnek a szerkesztése.
const BOSS_VICTORY_NARRATION = [
  'A Wing-Breaker térdre rogy. A testéhez varrt szárnyak\nutoljára megrándulnak, majd hamuvá válnak.',
  'A hamuból egyetlen varjú emelkedik ki.\nNem szól — csak kelet felé fordul.',
  'Lazarus utánanéz. A háta még mindig üres,\nde most már tudja, hol keresse a többit.',
  'A kapu nyitva marad.\nValaki másnak kell bezárnia.',
];

export default class BossScene extends Phaser.Scene {
  private player!: Player;
  /**
   * SZÁNDÉKOSAN csak a párbeszéd UTÁN jön létre. A PlayerController konstruktora regisztrálja
   * a J/F billentyű- és pointer-listenereket, tehát nem elég az update()-jét kihagyni: a
   * player a dialógus alatt így nem mozoghat, nem támadhat és nem varázsolhat.
   */
  private controller: PlayerController | null = null;
  private boss!: GraftedWingBreaker;
  private audio!: AudioManager;
  private chargeTrail!: AfterImageTrail;
  private dialogue: Dialogue | null = null;

  private playerHpText!: Phaser.GameObjects.Text;
  private bossHpBar!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;

  private fireballs: Fireball[] = [];
  private bossProjectiles: Fireball[] = [];

  private fightStarted = false;
  private outcomeScheduled = false;

  constructor() {
    super('BossScene');
  }

  create(): void {
    // Class field initializerek CSAK a Scene első létrehozásakor futnak le; a scene-be
    // való újbóli belépés (halál -> Level1Scene -> ajtó -> BossScene) ugyanazon a
    // példányon hívja újra a create()-et. Lásd CLAUDE.md "Fontos technikai tanulságok" 3.
    this.fireballs = [];
    this.bossProjectiles = [];
    this.controller = null;
    this.dialogue = null;
    this.fightStarted = false;
    this.outcomeScheduled = false;

    // Nem kell kézzel takarítani: az AudioManager maga iratkozik fel a scene SHUTDOWN-jára,
    // és fade nélkül elvágja a zenét — enélkül a scene-be újra belépve két loop szólna.
    this.audio = new AudioManager(this);

    this.cameras.main.setBackgroundColor('#100810');
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.fadeIn(600);

    this.createBackground();

    const ground = this.physics.add.staticGroup();
    const groundSprite = ground.create(ARENA_WIDTH / 2, GROUND_CENTER_Y, 'ground-placeholder')
      .setScale(ARENA_WIDTH / 64, 1)
      .refreshBody() as Phaser.Physics.Arcade.Sprite;
    // A talaj csak ÜTKÖZŐ, nem grafika: a háttéren 418 alatt a rajzolt kőfal-homlokzat
    // van, ami pont ezt a szerepet tölti be. A szürke placeholder téglalap kitakarná.
    // A body aktív marad, csak a rajzolás marad el.
    groundSprite.setVisible(false);

    this.player = new Player(this, PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
    this.physics.add.collider(this.player, ground);

    this.boss = new GraftedWingBreaker(this, BOSS_SPAWN_X, BOSS_SPAWN_Y);
    this.physics.add.collider(this.boss, ground);
    // Player és boss között SZÁNDÉKOSAN nincs collider: a sebzés a támadás-hitboxokon
    // keresztül megy, így nem tolják egymást a pálya szélére.

    // A charge sebesség-csíkja. A boss sprite csomagjában nincs dash animáció; a megtartott
    // kitörés-póz mellé ez adja a mozgás érzetét.
    this.chargeTrail = new AfterImageTrail(this, this.boss);

    this.registerCombatOverlaps(ground);
    this.registerBossEvents();

    this.createHud();
    this.startDialogue();
  }

  /**
   * A párbeszéd a boss entrance ELSŐ fele: a boss DORMANT, tehát nem mozog és nem is
   * sebezhető, a player pedig kontroller nélkül áll. A jobbra-nyíl gyorsítja a szöveget;
   * a párbeszéd magától is végigmegy. (A Boss2Scene / Boss3Scene / FinalBossScene mintája.)
   *
   * Vereség után a scene-be visszalépve a párbeszéd ÚJRA lefut, `skipDialogue` NINCS —
   * szemben a FinalBossScene-nel, ahová egy 7200 px-es pálya végéről vezetett az út. Ide a
   * Level 1 ajtajától néhány lépés, és a nyílat nyomva tartva négy sor pillanatok alatt
   * lepörög.
   */
  private startDialogue(): void {
    this.dialogue = new Dialogue(
      this,
      WING_BREAKER_DIALOGUE,
      { groundTop: GROUND_TOP, viewportWidth: ARENA_WIDTH },
      () => this.startEntrance()
    );

    // A KeyboardPlugin a scene leállásakor magától leiratkoztat, ezért itt nincs kézi
    // takarítás (a NarrationScene / Boss2Scene azonos mintája).
    this.input.keyboard?.on('keydown-RIGHT', () => this.dialogue?.advance());
  }

  /**
   * Álló, teljes képernyős háttér — NEM ParallaxBackground: a kamera fix, nincs mit
   * eltolni, és a kép pontosan 800x450, tehát skálázni sem kell.
   *
   * A korábbi 3 `pillar-placeholder` + 1 `door-placeholder` dekoráció törölve: a festményen
   * valódi oszlopok és egy valódi oltár/kapu van, a placeholderek csak kitakarnák őket.
   */
  private createBackground(): void {
    this.add
      .image(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, BACKGROUND_TEXTURES.BOSS_ARENA)
      .setDepth(-30)
      .setTint(BACKGROUND_TINT);
  }

  private registerCombatOverlaps(ground: Phaser.Physics.Arcade.StaticGroup): void {
    this.physics.add.overlap(
      this.player.getAttackHitbox(),
      this.boss,
      this.handlePlayerHitBoss,
      undefined,
      this
    );

    this.player.on('fireball-cast', (x: number, y: number, direction: number) => {
      this.fireballs.push(new Fireball(this, x, y, direction));
      this.audio.playSfx(SFX_KEYS.FIREBALL_CAST);
    });

    // Suhintás + lépés + ugrás + halál. Az arénában ugyanaz a lovag mozog, mint a pályákon,
    // tehát ugyanazt kell hallani — enélkül a boss-harc alatt némán futna és halna meg.
    bindPlayerSfx(this.player, this.audio);

    this.physics.add.overlap(this.fireballs, this.boss, this.handleFireballHitBoss, undefined, this);
    this.physics.add.overlap(
      this.bossProjectiles,
      this.player,
      this.handleBossProjectileHitPlayer,
      undefined,
      this
    );

    // Mindkét lövedék-fajta becsapódik a talajba.
    for (const projectiles of [this.fireballs, this.bossProjectiles]) {
      this.physics.add.collider(projectiles, ground, (projectileObj) => {
        const projectile = projectileObj as Fireball;
        if (projectile.active) projectile.onImpact();
      });
    }
  }

  private registerBossEvents(): void {
    // A boss csak eventet emittál, a lövedéket a scene hozza létre (ugyanaz a minta,
    // mint a Player 'fireball-cast'-ja) — így a boss osztály nem függ a Fireball-tól.
    this.boss.on('boss-projectile', (x: number, y: number, direction: number) => {
      this.bossProjectiles.push(
        new Fireball(this, x, y, direction, {
          texture: 'boss-projectile-placeholder',
          damage: PROJECTILE_DAMAGE,
          speed: PROJECTILE_SPEED,
          size: 20,
        })
      );
      this.audio.playSfx(SFX_KEYS.BOSS_PROJECTILE);
    });

    // Közelharci csapás: a hang a lecsapás pillanatában érkezik (a boss ott emittál).
    this.boss.on('boss-slash', () => this.audio.playSfx(SFX_KEYS.ENEMY_SWING));

    // Shadow Spell: a boss csak a CÉLPONTOT emittálja (a sebzést maga oldja fel), az
    // árny-oszlopot mi rajzoljuk ki. Az origin a Spell frame-ek mért geometriájából jön:
    // az oszlop talpa pontosan a megadott talaj-Y-ra ül, az izzás pedig a player feje
    // fölött lebeg, amíg le nem csap.
    this.boss.on('boss-spell', (x: number, groundY: number) => {
      const pillar = this.add
        .sprite(x, groundY, BOSS_TEXTURE_KEY)
        .setOrigin(SPELL_ORIGIN_X, SPELL_ORIGIN_Y)
        .setScale(BOSS_SCALE)
        .setDepth(5);

      pillar.play(WING_BREAKER_ANIMS.SPELL);
      pillar.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => pillar.destroy());

      // A hang a BECSAPÓDÁSKOR indul, nem a telegraph alatt: az izzás 960ms-ig lebeg (ez a
      // kitérési ablak), és az oszlop csak SPELL_IMPACT_MS-nél (f55) ér földet — pont ott,
      // ahol a boss a sebzést is feloldja. A konstans az ANIMÁCIÓS modulból jön, tehát a
      // hang nem csúszhat el a látványtól, ha a SPELL_TELEGRAPH_LOOPS valaha változik.
      //
      // Nincs "boss meghalt" guard: az oszlop ilyenkor is végigjátssza a becsapódást, csak
      // sebzés nélkül — a hangnak a látványt kell követnie. Scene-shutdownnál viszont a
      // Phaser törli a függő delayedCall-okat, tehát a győzelmi fade alá nem szól be.
      this.time.delayedCall(SPELL_IMPACT_MS, () =>
        this.audio.playSfx(SFX_KEYS.BOSS_SPELL_IMPACT)
      );
    });

    this.boss.on('boss-phase-change', () => {
      // TODO (Phase 8): fázisváltás sting + zene váltása intenzívebb loopra.
      this.cameras.main.shake(400, 0.012);

      const phaseText = this.add
        .text(ARENA_WIDTH / 2, 130, 'PHASE  II', {
          fontFamily: 'monospace',
          fontSize: '34px',
          color: '#ff4433',
        })
        .setOrigin(0.5)
        .setDepth(100);

      this.tweens.add({
        targets: phaseText,
        alpha: 0,
        duration: 1200,
        delay: 700,
        onComplete: () => phaseText.destroy(),
      });
    });
  }

  private createHud(): void {
    this.playerHpText = this.add
      .text(10, 10, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(100);

    this.bossNameText = this.add
      .text(ARENA_WIDTH / 2, HP_BAR_Y - 14, BOSS_NAME, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#d8c8d8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);

    this.bossHpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  // Boss entrance (Project_plan.md 15. pont): a boss DORMANT, amíg a cím be- és
  // kifadel — csak utána indul a fight.
  private startEntrance(): void {
    const title = this.add
      .text(ARENA_WIDTH / 2, 190, BOSS_NAME, {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#e8d8e8',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    const subtitle = this.add
      .text(ARENA_WIDTH / 2, 226, 'a varjak fogvatartója', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8a7a8a',
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(100);

    // Music transition (Project_plan.md 15. pont): a zene a belépőt KÍSÉRI, nem utána indul.
    this.audio.playMusic(MUSIC_KEYS.BOSS_THEME);

    this.tweens.add({
      targets: [title, subtitle],
      alpha: 1,
      duration: 700,
      hold: 900,
      yoyo: true,
      onComplete: () => {
        title.destroy();
        subtitle.destroy();
        this.beginFight();
      },
    });
  }

  private beginFight(): void {
    this.fightStarted = true;
    this.bossNameText.setVisible(true);
    // A player IRÁNYÍTÁSA is csak most nyílik meg — lásd a `controller` mező kommentjét.
    this.controller = new PlayerController(this, this.player);
    this.boss.activate();
  }

  update(_time: number, delta: number): void {
    // A dialógus a scene delta-idejéből ketyeg (nem saját timerből) — így a mag pure marad.
    if (this.dialogue && !this.dialogue.isFinished()) this.dialogue.update(delta);

    this.controller?.update();

    if (this.fightStarted) {
      this.boss.update(this.player);
    }

    // A dash sebesség-csíkja. A boss állapota public, ezért nem kell hozzá külön event.
    this.chargeTrail.update(this.boss.bossState === BossState.CHARGE);

    // Az inaktív lövedékek kitakarítása MINDIG helyben, splice()-szal: a tömbök
    // referenciája be van kötve a physics.add.overlap-ba, egy filter()-es újra-értékadás
    // elavult tömbre hagyná a collidert (CLAUDE.md "Fontos technikai tanulságok" 2.).
    for (const projectiles of [this.fireballs, this.bossProjectiles]) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (!projectiles[i].active) projectiles.splice(i, 1);
      }
    }

    this.playerHpText.setText(
      `HP: ${this.player.getHP()}/${this.player.getMaxHP()} | ${this.player.playerState}`
    );
    this.drawBossHealthBar();

    if (this.outcomeScheduled) return;

    if (this.boss.isDead()) {
      this.scheduleVictory();
    } else if (this.player.isDead()) {
      this.scheduleDefeat();
    }
  }

  private drawBossHealthBar(): void {
    this.bossHpBar.clear();
    if (!this.fightStarted) return;

    const ratio = Math.max(0, this.boss.getHP() / this.boss.getMaxHP());

    this.bossHpBar.fillStyle(0x000000, 0.6);
    this.bossHpBar.fillRect(HP_BAR_X - 3, HP_BAR_Y - 3, HP_BAR_WIDTH + 6, HP_BAR_HEIGHT + 6);
    this.bossHpBar.fillStyle(0x2a1218, 1);
    this.bossHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this.bossHpBar.fillStyle(this.boss.getPhase() === 2 ? 0xff3322 : 0xa02020, 1);
    this.bossHpBar.fillRect(HP_BAR_X, HP_BAR_Y, HP_BAR_WIDTH * ratio, HP_BAR_HEIGHT);
  }

  private scheduleVictory(): void {
    this.outcomeScheduled = true;
    this.registry.set('bossDefeated', true);
    this.audio.stopMusic();
    // TODO (Phase 8, később): victory sting a zene elhalkulása fölé.

    this.time.delayedCall(VICTORY_DELAY_MS, () => {
      this.fadeToScene('NarrationScene', {
        lines: BOSS_VICTORY_NARRATION,
        nextScene: 'Level2Scene',
      });
    });
  }

  // Vereség: vissza a Level1-re, ahol a player a CheckpointSystem pontján (a boss-ajtónál)
  // éled újra, és E-vel léphet be ismét — a boss ilyenkor friss HP-val indul.
  private scheduleDefeat(): void {
    this.outcomeScheduled = true;
    this.audio.stopMusic();

    this.time.delayedCall(DEFEAT_DELAY_MS, () => {
      this.fadeToScene('Level1Scene');
    });
  }

  // A fadeOut(duration, r, g, b, callback) callbackje MINDEN frame-ben lefut a fade alatt
  // (camera, progress paraméterekkel) — a FADE_OUT_COMPLETE event viszont pontosan egyszer,
  // a végén. Ezért váltunk scene-t innen, nem a fadeOut callbackjéből.
  private fadeToScene(key: string, data?: object): void {
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key, data);
    });
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  }

  private handlePlayerHitBoss(
    hitbox: PhysicsOverlapObject,
    bossObj: PhysicsOverlapObject
  ): void {
    const boss = bossObj as GraftedWingBreaker;
    if (boss.isDead() || this.player.hasHitTarget(boss)) return;

    const damage = (hitbox as Phaser.GameObjects.Zone).getData('damage') as number;
    boss.takeDamage(damage);
    this.player.registerHit(boss);
    // Ugyanaz a kard, ugyanaz a becsapódás, mint a CrowHarvesteren — a hasHitTarget()
    // guard itt is csapásonként egyre korlátozza.
    this.audio.playSfx(SFX_KEYS.SWORD_IMPACT);
  }

  private handleFireballHitBoss(
    fireballObj: PhysicsOverlapObject,
    bossObj: PhysicsOverlapObject
  ): void {
    const fireball = fireballObj as Fireball;
    const boss = bossObj as GraftedWingBreaker;
    if (!fireball.active || fireball.hasAlreadyHit() || boss.isDead()) return;

    boss.takeDamage(fireball.getDamage());
    fireball.onImpact();
  }

  private handleBossProjectileHitPlayer(
    projectileObj: PhysicsOverlapObject,
    playerObj: PhysicsOverlapObject
  ): void {
    const projectile = projectileObj as Fireball;
    const player = playerObj as Player;
    if (!projectile.active || projectile.hasAlreadyHit() || player.isDead()) return;

    player.takeDamage(projectile.getDamage());
    projectile.onImpact();
  }
}
