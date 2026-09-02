import Phaser from 'phaser';
import {
  AttackType,
  ATTACK_CONFIGS,
  AttackConfig,
  HEAVY_CHARGE_HITS,
  HEAVY_ECHO_OFFSET_PX,
} from '../combat/Attack';
import {
  FIREBALL_CONFIG,
  FIREBALL_MAX_CHARGES,
  FIREBALL_RECHARGE_MS,
} from '../combat/Projectile';
import type { Damageable } from '../combat/DamageSystem';
import {
  animKeyForState,
  ARC_CROP_X,
  BODY_HEIGHT,
  BODY_OFFSET_X,
  BODY_OFFSET_Y,
  BODY_WIDTH,
  CAST_ANIM_MS,
  FOOTSTEP_INTERVAL_MS,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  HEAVY_WAVE_ALPHA,
  HEAVY_WAVE_TINT,
  HURT_ANIM_MS,
  ORIGIN_Y,
  PLAYER_ANIMS,
  PLAYER_TEXTURES,
} from './PlayerAnimations';

export enum PlayerState {
  IDLE = 'IDLE',
  RUN = 'RUN',
  JUMP = 'JUMP',
  FALL = 'FALL',
  ATTACK = 'ATTACK',
  CAST = 'CAST',
  HURT = 'HURT',
  CLIMB = 'CLIMB',
  DEAD = 'DEAD',
}

/**
 * Egy létra "sínje", amit a scene ad át a playernek minden frame-ben.
 * A topY/bottomY a player KÖZÉPPONTJÁNAK megengedett szélsőértékei, nem a létra grafikájáé.
 */
export interface LadderContact {
  centerX: number;
  topY: number;
  bottomY: number;
}

export const MOVE_SPEED = 200;
export const JUMP_VELOCITY = -500;
export const MAX_HP = 100;
// A cast- és a hurt-lock hossza az ANIMÁCIÓK hosszából jön (PlayerAnimations.ts), hogy a
// kettő ne csúszhasson el egymástól: a fireball pont akkor születik, amikor a lovag kezében
// szikrákra pattan a gömb, és a HURT state pont a hurt animáció végéig tart.
export const CAST_DELAY_MS = CAST_ANIM_MS;
export const HURT_LOCK_MS = HURT_ANIM_MS;
export const CLIMB_SPEED = 130;
/** A fireball a lovag felemelt keze magasságában szülessen, ne a sprite közepén. */
const FIREBALL_SPAWN_OFFSET_Y = -8;

/**
 * A heavy KÉT izzó hulláma, a player középpontjához képest.
 *
 * A `0` az a fedőréteg, ami a lovag SAJÁT ívére kerül (a crop miatt csak az ívre, a testére
 * nem) — ettől lobban lángra az első hullám is, nem csak a második. A
 * `HEAVY_ECHO_OFFSET_PX` a mért sávhossz, tehát a második hullám PONTOSAN ott kezdődik, ahol
 * az első véget ér.
 *
 * Ha valaha három hullámú változat kell, itt egy elem hozzáadása elég — a hitbox viszont
 * NEM követi magától (lásd az Attack.ts levezetését).
 */
const HEAVY_WAVE_OFFSETS = [0, HEAVY_ECHO_OFFSET_PX];

export default class Player extends Phaser.Physics.Arcade.Sprite implements Damageable {
  public playerState: PlayerState = PlayerState.IDLE;

  private hp = MAX_HP;
  private isAttacking = false;
  private canAttack = true;
  private isCasting = false;
  private canCastFireball = true;

  private ladder: LadderContact | null = null;
  private climbing = false;

  private attackHitbox: Phaser.GameObjects.Zone;
  private attackHitboxBody: Phaser.Physics.Arcade.Body;
  private hitTargetsThisAttack: Set<Phaser.GameObjects.GameObject> = new Set();

  /**
   * Az ÉPP futó (vagy legutóbbi) támadás típusa. Két helyen kell:
   *  - az animáció-kulcs kiválasztásához (a HEAVY lassabb tempóval fut),
   *  - a `registerHit()`-ben, hogy a heavy SAJÁT találatai ne töltsék újra a heavy-t.
   */
  private currentAttackType: AttackType = AttackType.SWORD;

  /** Hány beérkezett alapcsapás gyűlt össze a következő heavy-hez (0..HEAVY_CHARGE_HITS). */
  private heavyCharge = 0;

  /**
   * A HEAVY izzó hullámai: a lovag testéről levágott, egymás után sorakozó ív-másolatok.
   * Lásd `HEAVY_WAVE_OFFSETS`.
   */
  private slashWaves: Phaser.GameObjects.Sprite[] = [];

  /**
   * Az elköltött tűzgolyó-töltetek visszatérési időpontjai (abszolút `scene.time.now`).
   *
   * A tömb MAGÁTÓL növekvő sorrendű marad — a `now` monoton, a `FIREBALL_RECHARGE_MS`
   * pedig konstans —, ezért elég az elejéről lejárat szerint ürítgetni
   * (`pruneFireballCharges()`). Ez adja a kért, EGYMÁSTÓL FÜGGETLEN visszatöltést:
   * minden töltet a SAJÁT elköltésétől számítva tér vissza, nem sorban egymás után.
   *
   * Szándékosan NEM `delayedCall`: így a `performAttack()`/`castFireball()` időzítő-
   * regisztrációi (és a rájuk épülő unit tesztek sorrendje) érintetlenek maradnak, a
   * viselkedés pedig `scene.time.now` léptetésével közvetlenül tesztelhető.
   */
  private fireballRechargeAt: number[] = [];

  /** Az épp lejátszott animáció kulcsa — lásd playAnim(). */
  private currentAnimKey: string | null = null;

  /**
   * Az utolsó lépéshang ideje (`scene.time.now`), vagy `null`, ha a player épp NEM fut.
   * A `null` nem csak "még nem lépett": ez teszi a RUN-ba lépés ELSŐ lépését azonnalivá
   * — lásd updateFootsteps().
   */
  private lastFootstepAt: number | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PLAYER_TEXTURES.IDLE, 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);

    // A sprite frame-je 128x64, de a rajzolt karakter csak ~28x46 ezen belül. Az origin
    // úgy van megválasztva, hogy a TALP a sprite.y + 24-nél legyen (lásd ORIGIN_Y).
    this.setOrigin(0.5, ORIGIN_Y);

    // Közvetlenül a body-n, NEM a sprite setSize()/setOffset()-jén: az Arcade.Sprite-on a
    // Components.Size verziója árnyékolja a GameObject-ét, és a kettő mást csinál
    // (logikai megjelenítési méret vs. physics body). A setSize center paramétere false,
    // különben újraközpontozná — és felülírná — az utána beállított offsetet.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    body.setOffset(BODY_OFFSET_X, BODY_OFFSET_Y);

    this.attackHitbox = scene.add.zone(x, y, 10, 10);
    scene.physics.add.existing(this.attackHitbox);
    this.attackHitboxBody = this.attackHitbox.body as Phaser.Physics.Arcade.Body;
    this.attackHitboxBody.setAllowGravity(false);
    this.attackHitboxBody.enable = false;

    // A heavy izzó hullámai. Ugyanaz az újrahasznált-objektum minta, mint az
    // attackHitboxnál: egyszer jönnek létre, aztán csak pozíciót és láthatóságot váltanak.
    // A crop vágja le róluk a lovag testét — enélkül egy második lovag állna a player előtt.
    // A `flipX`-et NEM kell kézzel tükrözni: a Phaser 4 `Frame.setCropUVs()` a mintavett
    // sávot magától tükrözi, tehát balra fordulva a hullám a bal oldalra kerül.
    //
    // Depth-et nem kapnak: a player UTÁN kerülnek a display listára, tehát fölötte
    // rajzolódnak — és a crop miatt amúgy sem fedik a testét.
    this.slashWaves = HEAVY_WAVE_OFFSETS.map(() =>
      scene.add
        .sprite(x, y, PLAYER_TEXTURES.ATTACK)
        .setOrigin(0.5, ORIGIN_Y)
        .setCrop(ARC_CROP_X, 0, FRAME_WIDTH - ARC_CROP_X, FRAME_HEIGHT)
        .setTint(HEAVY_WAVE_TINT)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(HEAVY_WAVE_ALPHA)
        .setVisible(false)
    );

    // Enélkül a player a legelső updateState()-ig a sheet 0. frame-jén állna mozdulatlanul.
    this.updateAnimation();
  }

  getAttackHitbox(): Phaser.GameObjects.Zone {
    return this.attackHitbox;
  }

  moveLeft(): void {
    if (this.isLocked()) return;
    this.setVelocityX(-MOVE_SPEED);
    this.setFlipX(true);
    if (this.isGrounded()) this.playerState = PlayerState.RUN;
  }

  moveRight(): void {
    if (this.isLocked()) return;
    this.setVelocityX(MOVE_SPEED);
    this.setFlipX(false);
    if (this.isGrounded()) this.playerState = PlayerState.RUN;
  }

  // Korábban `stop()` volt, ami elfedte a Phaser Sprite.stop()-ját (az animációt állítja
  // meg). Amíg nem volt valódi animáció, ez ártalmatlan volt; a Phase 8 sprite-jaival
  // viszont már ütközne, ezért kapott saját nevet.
  stopMoving(): void {
    if (this.isLocked()) return;
    this.setVelocityX(0);
    if (this.isGrounded()) this.playerState = PlayerState.IDLE;
  }

  jump(): void {
    if (this.isLocked()) return;
    if (this.isGrounded()) {
      this.setVelocityY(JUMP_VELOCITY);
      this.playerState = PlayerState.JUMP;
      // A hangot a SCENE játssza le (mint a 'sword-swing'-nél). A grounded-guardon BELÜL
      // van, tehát a levegőben hiába nyomott ugrás néma marad — hangspam nélkül.
      this.emit('player-jump');
    }
  }

  // --- Létra / mászás ---------------------------------------------------
  // A scene minden frame-ben átadja, hogy a player épp létrával fedésben van-e.
  // A mászás egy zárt "sín": a topY/bottomY közé clampeljük a pozíciót, mert
  // climb közben a body.checkCollision.down ki van kapcsolva (hogy az egyirányú
  // felső platformon át lehessen mászni), így a talaj sem fogná meg lefelé.

  setLadderContact(contact: LadderContact | null): void {
    this.ladder = contact;
    if (!contact && this.climbing) this.exitLadder();
  }

  isOnLadder(): boolean {
    return this.ladder !== null;
  }

  isClimbing(): boolean {
    return this.climbing;
  }

  climb(direction: -1 | 1): void {
    if (this.isLocked() || !this.ladder) return;

    const body = this.body as Phaser.Physics.Arcade.Body;

    if (!this.climbing) {
      this.climbing = true;
      body.setAllowGravity(false);
      body.checkCollision.down = false;
    }

    this.playerState = PlayerState.CLIMB;
    this.setVelocityX(0);
    // Lágy rásnapelés a létra közepére, hogy ne lógjon félig mellette.
    this.x = Phaser.Math.Linear(this.x, this.ladder.centerX, 0.4);

    this.setVelocityY(direction * CLIMB_SPEED);

    if (direction < 0 && this.y <= this.ladder.topY) {
      this.y = this.ladder.topY;
      this.setVelocityY(0);
    } else if (direction > 0 && this.y >= this.ladder.bottomY) {
      this.y = this.ladder.bottomY;
      this.setVelocityY(0);
    }
  }

  /** Létrán lógás: nincs függőleges input, de a gravitáció továbbra is ki van kapcsolva. */
  climbIdle(): void {
    if (!this.climbing) return;
    this.setVelocity(0, 0);
    this.playerState = PlayerState.CLIMB;
  }

  exitLadder(): void {
    if (!this.climbing) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.climbing = false;
    body.setAllowGravity(true);
    body.checkCollision.down = true;

    if (this.playerState === PlayerState.CLIMB) {
      this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
    }
  }

  jumpOffLadder(): void {
    if (!this.climbing) return;
    this.exitLadder();
    this.setVelocityY(JUMP_VELOCITY);
    this.playerState = PlayerState.JUMP;
  }

  // ----------------------------------------------------------------------

  /** A player alap kardtámadása (J / bal egérgomb). */
  attack(): void {
    this.performAttack(AttackType.SWORD);
  }

  /**
   * A nagy csapás (K / jobb egérgomb). Nincs saját, magától lejáró cooldownja: kizárólag
   * `HEAVY_CHARGE_HITS` beérkezett alapcsapásból tölthető fel — ez kényszeríti a playert
   * a közelharcra a távolsági spam helyett.
   */
  heavyAttack(): void {
    this.performAttack(AttackType.HEAVY);
  }

  private performAttack(type: AttackType): void {
    if (this.isLocked() || this.climbing || !this.canAttack) return;
    // A töltés-kapu a többi guard MELLETT, MINDEN állapotváltás és event ELŐTT áll:
    // a blokkolt heavy így néma marad és nem is animál — ugyanaz az elv, mint a
    // cooldownnal blokkolt alapcsapásnál.
    if (type === AttackType.HEAVY && !this.isHeavyReady()) return;

    const config = ATTACK_CONFIGS[type];
    this.isAttacking = true;
    this.canAttack = false;
    this.currentAttackType = type;
    this.playerState = PlayerState.ATTACK;
    this.hitTargetsThisAttack.clear();
    this.setVelocityX(0);

    if (type === AttackType.HEAVY) {
      this.heavyCharge = 0;
      this.showSlashWaves();
    }

    // A suhintás hangját a SCENE játssza le (ugyanaz a minta, mint a 'fireball-cast'):
    // a Player így nem függ az AudioManagertől, a kibocsátás pedig unit-tesztben
    // megfigyelhető. A hívás a fenti guard MÖGÖTT van, tehát a cooldownnal blokkolt vagy
    // létrán próbált támadás nem ad hangot — hangspam hitbox nélkül nem lehetséges.
    //
    // A hang AZONNAL, a gombnyomásra szól, nem a 150ms-os startup után: az azonnali
    // input-visszajelzés többet ér, mint a képi szinkron — a whoosh a windup alatt fut fel,
    // és épp a csapás frame-jére ér a csúcsára.
    this.emit(type === AttackType.HEAVY ? 'heavy-swing' : 'sword-swing');

    // A korábbi sárga attack-tint elmaradt: a támadás-animáció önmagában közli az infót.
    // Nullázás a playAnim() guardja miatt: két gyors csapás között a kulcs nem változna.
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.time.delayedCall(config.startupDelayMs, () => {
      if (this.playerState === PlayerState.DEAD) return;
      this.enableHitbox(config);

      this.scene.time.delayedCall(config.activeDurationMs, () => {
        this.disableHitbox();
      });
    });

    this.scene.time.delayedCall(config.startupDelayMs + config.activeDurationMs, () => {
      this.isAttacking = false;
      // A heavy hullámai a MEGLÉVŐ időzítőn tűnnek el, szándékosan nem egy újon: a
      // performAttack() delayedCall-jainak száma és REGISZTRÁCIÓS SORRENDJE így
      // változatlan marad (a combat.test.ts erre lépteti a támadás-teszteket).
      this.hideSlashWaves();
      if (this.playerState === PlayerState.ATTACK) {
        this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
      }
    });

    this.scene.time.delayedCall(config.cooldownMs, () => {
      this.canAttack = true;
    });
  }

  private enableHitbox(config: AttackConfig): void {
    const direction = this.flipX ? -1 : 1;
    const offsetX = config.hitboxOffsetX * direction;

    this.attackHitboxBody.setSize(config.hitboxWidth, config.hitboxHeight);
    this.attackHitboxBody.reset(this.x + offsetX, this.y);
    this.attackHitboxBody.enable = true;
    this.attackHitbox.setData('damage', config.damage);
  }

  private disableHitbox(): void {
    this.attackHitboxBody.enable = false;
  }

  // --- Heavy slash ------------------------------------------------------

  /**
   * A hullámok kirakása. Az első a lovag SAJÁT ívére fekszik (offset 0) és felizzítja, a
   * második a mért sávhossznyival előrébb — tehát PONTOSAN ott kezdődik, ahol az első véget
   * ér. A kettő így egyetlen, kétszer olyan messzire érő lángcsapásnak olvas.
   */
  private showSlashWaves(): void {
    this.syncSlashWaves();
    for (const wave of this.slashWaves) {
      wave.setVisible(true);
      wave.play(PLAYER_ANIMS.ATTACK_HEAVY, true);
    }
  }

  private hideSlashWaves(): void {
    for (const wave of this.slashWaves) wave.setVisible(false);
  }

  /**
   * A hullámok a playerhez vannak ragasztva, amíg látszanak. Vízszintesen nem mozdulhatnak
   * el (a támadás `setVelocityX(0)`-val kezd), FÜGGŐLEGESEN viszont igen: a levegőben
   * indított heavy alatt a player tovább esik/emelkedik.
   */
  private syncSlashWaves(): void {
    const direction = this.flipX ? -1 : 1;
    this.slashWaves.forEach((wave, index) => {
      wave.setPosition(this.x + direction * HEAVY_WAVE_OFFSETS[index], this.y);
      wave.setFlipX(this.flipX);
    });
  }

  getHeavyCharge(): number {
    return this.heavyCharge;
  }

  getHeavyChargeMax(): number {
    return HEAVY_CHARGE_HITS;
  }

  isHeavyReady(): boolean {
    return this.heavyCharge >= HEAVY_CHARGE_HITS;
  }

  // ----------------------------------------------------------------------

  hasHitTarget(target: Phaser.GameObjects.GameObject): boolean {
    return this.hitTargetsThisAttack.has(target);
  }

  /**
   * A scene-ek ezt hívják EGY sikeres, ténylegesen sebző találat után — ez az egyetlen
   * pont, ahol a Player megtudja, hogy egy csapása beérkezett, ezért itt tölt a heavy.
   *
   * Két megszorítással:
   *  - CSAK alapcsapásra tölt, különben a heavy önmagát finanszírozná;
   *  - csapásonként EGYSZER (`size === 0` = ez a swing első találata), tehát egy több
   *    ellenfelet elérő ív sem ad több töltetet. A swing számít, nem a célpont — így a
   *    töltődés üteme kiszámítható, nem a tömeg sűrűségétől függ.
   */
  registerHit(target: Phaser.GameObjects.GameObject): void {
    if (this.currentAttackType === AttackType.SWORD && this.hitTargetsThisAttack.size === 0) {
      this.heavyCharge = Math.min(this.heavyCharge + 1, HEAVY_CHARGE_HITS);
    }
    this.hitTargetsThisAttack.add(target);
  }

  // --- Tűzgolyó töltetek ------------------------------------------------

  /**
   * A lejárt visszatöltéseket kiveszi a sorból. A tömb növekvő sorrendű (lásd a mező
   * doc-kommentjét), ezért elég az elejéről addig ürítenünk, amíg lejárt bejegyzést látunk.
   */
  private pruneFireballCharges(): void {
    const now = this.scene.time.now;
    while (this.fireballRechargeAt.length > 0 && this.fireballRechargeAt[0] <= now) {
      this.fireballRechargeAt.shift();
    }
  }

  getFireballCharges(): number {
    return FIREBALL_MAX_CHARGES - this.fireballRechargeAt.length;
  }

  getFireballMaxCharges(): number {
    return FIREBALL_MAX_CHARGES;
  }

  /**
   * A LEGKÖZELEBB visszatérő töltet állapota, 0..1. Teli tárnál 1 — így a HUD-nak nem kell
   * külön esetet kezelnie az "épp nincs mit tölteni" helyzetre.
   */
  getFireballRechargeProgress(): number {
    const next = this.fireballRechargeAt[0];
    if (next === undefined) return 1;

    const remaining = next - this.scene.time.now;
    return Phaser.Math.Clamp(1 - remaining / FIREBALL_RECHARGE_MS, 0, 1);
  }

  // Fireball castolás: elindítja a CAST state-et, majd egy rövid startup delay után
  // 'fireball-cast' eventet emittál — a scene ezt figyeli és hozza létre a Fireballt.
  // A Player így nem függ közvetlenül a Fireball/scene projectile-group implementációtól.
  castFireball(): void {
    if (this.isLocked() || this.climbing || !this.canCastFireball) return;

    // Védekező pruning: az updateState() amúgy is minden frame-ben fut, de a cast egy
    // billentyű-listenerből jön, tehát a frissesség itt nem a hívási sorrenden múlik.
    this.pruneFireballCharges();
    if (this.getFireballCharges() <= 0) return;

    // A töltet a GOMBNYOMÁSKOR fogy, nem a lövedék születésekor: az elkötelezettség
    // pillanata számít, különben a 260 ms-os cast alatt még "ingyen" meg lehetne szakítani.
    this.fireballRechargeAt.push(this.scene.time.now + FIREBALL_RECHARGE_MS);

    this.isCasting = true;
    this.canCastFireball = false;
    this.playerState = PlayerState.CAST;
    this.setVelocityX(0);
    // A korábbi kék cast-tint elmaradt: a cast-animáció (felemelt izzó gömb + szikrák)
    // maga a visszajelzés.
    //
    // Nullázás a playAnim() guardja miatt — ugyanaz az indok, mint a támadásnál. Amíg a
    // tűzgolyó korlátlan volt, az 500 ms-os cooldown mindig hosszabb volt a 260 ms-os
    // animációnál, tehát nem kellett; egy két-töltetes sorozatnál viszont a második cast
    // az animáció utolsó frame-jén ragadhatna.
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.time.delayedCall(CAST_DELAY_MS, () => {
      this.isCasting = false;

      if (this.playerState === PlayerState.DEAD) return;

      const direction = this.flipX ? -1 : 1;
      this.emit(
        'fireball-cast',
        this.x + direction * 20,
        this.y + FIREBALL_SPAWN_OFFSET_Y,
        direction
      );

      if (this.playerState === PlayerState.CAST) {
        this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
      }
    });

    this.scene.time.delayedCall(FIREBALL_CONFIG.cooldownMs, () => {
      this.canCastFireball = true;
    });
  }

  takeDamage(amount: number): void {
    if (this.playerState === PlayerState.DEAD) return;

    // Sebzés lelöki a létráról — különben HURT után kikapcsolt gravitációval lebegne.
    this.exitLadder();

    this.hp = Math.max(0, this.hp - amount);
    this.playerState = PlayerState.HURT;
    // A piros villanás MARAD az animáció mellett is: a sebzés-visszajelzésnek egy
    // 3 frame-es hurt animációnál erősebbnek kell lennie, hogy harc közben is olvasható legyen.
    this.setTint(0xff0000);
    // Nullázás a playAnim() guardja miatt: két gyors találat között a state végig HURT
    // marad, tehát a kulcs nem változna — a második ütésre nem indulna újra az animáció.
    this.currentAnimKey = null;
    this.updateAnimation();

    this.scene.time.delayedCall(HURT_LOCK_MS, () => {
      this.clearTint();
      if (this.hp <= 0) {
        this.die();
      } else if (this.playerState === PlayerState.HURT) {
        this.playerState = this.isGrounded() ? PlayerState.IDLE : PlayerState.FALL;
      }
    });
  }

  private die(): void {
    this.exitLadder();
    this.playerState = PlayerState.DEAD;
    this.setVelocity(0, 0);
    this.disableHitbox();
    // A megkezdett heavy hullámai ne lógjanak a képen, amíg a lovag összerogy.
    this.hideSlashWaves();
    this.lastFootstepAt = null;
    // Egyetlen halál = egyetlen nyögés. A takeDamage() DEAD-guardja miatt a die() nem
    // futhat le kétszer, és ez az ág fedi a zuhanás-halált is (az takeDamage(getHP())-en
    // keresztül jön be) — nem kell külön esemény a szakadéknak.
    this.emit('player-death');
    // A korábbi szürke tint elmaradt: a Death animáció (a lovag összerogy, majd
    // fekve marad az utolsó frame-en) önmagában közli a halált.
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.updateAnimation();
  }

  // A die() ellentéte: visszaállítja a playert élő, harcra kész állapotba a megadott
  // pozíción. Minden olyan flaget visszaállít, amit a die() "befagyaszt", vagy ami a
  // halál pillanatában épp mászás/támadás-cooldown közben ragadhatott volna.
  respawn(x: number, y: number): void {
    this.hp = MAX_HP;
    this.x = x;
    this.y = y;
    this.setVelocity(0, 0);
    this.clearTint();

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    body.setAllowGravity(true);
    body.checkCollision.down = true;

    this.isAttacking = false;
    this.canAttack = true;
    this.isCasting = false;
    this.canCastFireball = true;
    this.climbing = false;
    this.ladder = null;
    this.hitTargetsThisAttack.clear();
    this.disableHitbox();

    this.currentAttackType = AttackType.SWORD;
    this.hideSlashWaves();
    // A felhalmozott heavy ELVÉSZ: a haláleset visszaállít, nem továbbvisz. Konzisztens
    // azzal, hogy a player halálakor az enemyk is újraélednek — egy nehéz szakaszt nem
    // lehet ismételt halálokkal "lekoptatni", felgyűjtött nagy csapással a zsebben.
    this.heavyCharge = 0;
    // A tár TELE éled újra (mint a canCastFireball). Helyben ürítés, a projekt tömb-szabálya
    // szerint — bár ez a tömb nem kötődik colliderhez, a minta egységes marad.
    this.fireballRechargeAt.length = 0;
    // Nullázni KELL: enélkül a halál előtti utolsó lépés ideje maradna érvényben, és a
    // respawn utáni első lépés a kadencia szerint késne (vagy azonnal duplázna).
    this.lastFootstepAt = null;

    this.playerState = PlayerState.IDLE;
    // Nullázni KELL: a playAnim() guardja miatt egy „ugyanaz a kulcs” egyébként átugorná
    // az újraindítást, és a halál animáció utolsó (fekvő) frame-jén ragadna a sprite.
    this.currentAnimKey = null;
    this.updateAnimation();
  }

  isDead(): boolean {
    return this.playerState === PlayerState.DEAD;
  }

  getHP(): number {
    return this.hp;
  }

  getMaxHP(): number {
    return MAX_HP;
  }

  private isLocked(): boolean {
    return (
      this.playerState === PlayerState.DEAD ||
      this.playerState === PlayerState.HURT ||
      this.playerState === PlayerState.ATTACK ||
      this.playerState === PlayerState.CAST
    );
  }

  isGrounded(): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    return body.blocked.down || body.touching.down;
  }

  updateState(): void {
    this.applyAirborneState();
    // MINDIG lefut, az applyAirborneState() korai return-jeitől függetlenül — különben
    // pont a lockolt state-ek (ATTACK, HURT, DEAD) és a mászás maradnának animáció nélkül.
    this.updateAnimation();
    this.updateFootsteps();

    // A tűzgolyó-töltetek per-frame lejáratása. Ez a hook azért jó hely, mert a
    // PlayerController MINDKÉT ága meghívja, és a controller nélküli scene-ek (PreScene),
    // illetve a befagyasztott input (Level1Scene ház-párbeszéd) is kötelesek hívni.
    this.pruneFireballCharges();

    if (this.slashWaves[0].visible) this.syncSlashWaves();
  }

  /**
   * A lépéshangok kadenciája — a projekt EGYETLEN ismétlődő SFX-e. Minden más hang diszkrét
   * eseményre szól (csapás, cast, halál); ez viszont addig ismétlődik, amíg a player fut,
   * ezért kell hozzá saját időzítés.
   *
   * A `lastFootstepAt = null` állapot kettős szerepű: azt is jelenti, hogy a player NEM fut,
   * és azt is, hogy a következő lépés AZONNAL esedékes. Enélkül a RUN-ba lépés után egy
   * teljes intervallumnyi néma futás lenne, ami pont az indulást tenné súlytalanná.
   *
   * Külön guard a CLIMB / ATTACK / CAST / HURT / JUMP / FALL / DEAD state-ekre NEM kell:
   * egyikük sem RUN, tehát mind a `null`-ágon némul el. A `isGrounded()` a redundancia
   * kedvéért van ott — a RUN state-et ma csak grounded ágon lehet felvenni, de egy jövőbeli
   * levegő-mozgás nem tehet láthatatlanul lépkedő playert.
   */
  private updateFootsteps(): void {
    if (this.playerState !== PlayerState.RUN || !this.isGrounded()) {
      this.lastFootstepAt = null;
      return;
    }

    const now = this.scene.time.now;
    if (this.lastFootstepAt !== null && now - this.lastFootstepAt < FOOTSTEP_INTERVAL_MS) {
      return;
    }

    this.lastFootstepAt = now;
    this.emit('footstep');
  }

  private applyAirborneState(): void {
    // Mászás közben nem szabad JUMP/FALL-ra váltani — a CLIMB state-et a climb() vezérli.
    if (this.climbing) return;
    if (this.isLocked() || this.isAttacking || this.isCasting) return;

    if (!this.isGrounded()) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.playerState = body.velocity.y < 0 ? PlayerState.JUMP : PlayerState.FALL;
    }
  }

  private updateAnimation(): void {
    this.playAnim(animKeyForState(this.playerState, this.currentAttackType));

    // Létrán állva (nincs függőleges input) a mászás-animáció fagyjon ki, ne pörögjön
    // a helyben álló lovag alatt.
    if (this.playerState === PlayerState.CLIMB) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body.velocity.y === 0) {
        this.anims.pause();
      } else {
        this.anims.resume();
      }
    }
  }

  /**
   * Csak akkor indít animációt, ha ténylegesen VÁLTOZOTT a kulcs. Enélkül a nem loopoló
   * animációk (DEAD, ATTACK, HURT, CAST) minden frame-ben újraindulnának: a lejátszás
   * végén a `play(key, true)` „ignoreIfPlaying” ága már nem fogna, mert az animáció
   * ilyenkor épp NEM playing — a halál animáció így vég nélkül loopolna.
   */
  private playAnim(key: string): void {
    if (this.currentAnimKey === key) return;
    this.currentAnimKey = key;
    this.play(key, true);
  }
}