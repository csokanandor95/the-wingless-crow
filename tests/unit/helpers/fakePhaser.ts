// A 'phaser' modul fake helyettesítője a unit tesztekhez. NEM vi.mock()-ba csomagolva —
// minden teszt fájl saját maga hívja meg `vi.mock('phaser', createFakePhaserModule)`-ként
// a saját tetején (ez garantáltan jól hoisztolódik vitesttel), ez a fájl csak a tényleges
// definíciót adja megosztva, hogy ne kelljen háromszor leírni.
//
// A valódi Phaser csomag már betöltéskor (window global hiányában) elszáll Node alatt,
// ezért nem hívható rá `importOriginal()` sem — ez a fake teljesen önálló, csak azt a
// felületet adja, amit a src/ osztályok (Player, CrowHarvester, Fireball) ténylegesen használnak:
// Physics.Arcade.Sprite (mindhárom ebből örököl), Events.EventEmitter, Math.Linear
// (Player.climb() lágy rásnapelése) és Math.Distance.Between (CrowHarvester távolság-számításai).
export function createFakePhaserModule() {
  class EventEmitter {
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

    on(event: string, cb: (...args: unknown[]) => void) {
      const list = this.listeners.get(event) ?? [];
      list.push(cb);
      this.listeners.set(event, list);
      return this;
    }

    emit(event: string, ...args: unknown[]) {
      for (const cb of this.listeners.get(event) ?? []) cb(...args);
      return true;
    }
  }

  // A sprite AnimationState-jének minimális mása. A `playedKeys` azért van, hogy a tesztek
  // ne csak az AKTUÁLIS animációt, hanem a lejátszás-hívások SZÁMÁT is nézhessék — ezen
  // múlik a Player.playAnim() guardja (egy state ne indítsa újra minden frame-ben az animját).
  class MockAnimationState {
    currentKey: string | null = null;
    playedKeys: string[] = [];
    paused = false;

    play(key: string) {
      this.currentKey = key;
      this.playedKeys.push(key);
      this.paused = false;
      return this;
    }
    pause() {
      this.paused = true;
      return this;
    }
    resume() {
      this.paused = false;
      return this;
    }
    stop() {
      this.currentKey = null;
      return this;
    }
  }

  class MockSprite extends EventEmitter {
    scene: unknown;
    x: number;
    y: number;
    texture: string;
    flipX = false;
    active = true;
    visible = true;
    // A CrowHarvester halál-tweenje ezt animálja; a tween mock nem futtatja, de a
    // tween-konfig ellenőrzéséhez a mezőnek léteznie kell.
    alpha = 1;
    originX = 0.5;
    originY = 0.5;
    scaleX = 1;
    scaleY = 1;
    depth = 0;
    // A tint mostantól MEGFIGYELHETŐ: a boss hit-villanása FILL módú fehér tint (a MULTIPLY
    // módú fehér ugyanis az egységelem, tehát no-op lenne), és a charge piros telegraph-ja
    // sem törlődhet el egy találattól. Enélkül a tesztek nem tudnák ezt őrizni.
    tintColor: number | null = null;
    tintMode = 0; // Phaser.TintModes.MULTIPLY
    anims = new MockAnimationState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any = null;

    constructor(scene: unknown, x: number, y: number, texture: string) {
      super();
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.texture = texture;
    }

    setCollideWorldBounds() {
      return this;
    }
    setOrigin(x: number, y?: number) {
      this.originX = x;
      this.originY = y ?? x;
      return this;
    }
    /** A Phaser Sprite.play()-je az AnimationState-re delegál — a mock is így tesz. */
    play(key: string, _ignoreIfPlaying?: boolean) {
      this.anims.play(key);
      return this;
    }
    setVelocityX(x: number) {
      this.body.velocity.x = x;
      return this;
    }
    setVelocityY(y: number) {
      this.body.velocity.y = y;
      return this;
    }
    setVelocity(x: number, y: number) {
      this.body.velocity.x = x;
      this.body.velocity.y = y;
      return this;
    }
    setFlipX(v: boolean) {
      this.flipX = v;
      return this;
    }
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    }
    setScale(x: number, y?: number) {
      this.scaleX = x;
      this.scaleY = y ?? x;
      return this;
    }
    setDepth(v: number) {
      this.depth = v;
      return this;
    }
    setAlpha(v: number) {
      this.alpha = v;
      return this;
    }
    setTint(color: number) {
      this.tintColor = color;
      return this;
    }
    /** Phaser 4: a tint SZÍNE és MÓDJA külön beállítás (a setTintFill() törölve lett). */
    setTintMode(mode: number) {
      this.tintMode = mode;
      return this;
    }
    clearTint() {
      this.tintColor = null;
      return this;
    }
    destroy() {
      this.active = false;
    }
  }

  const FakePhaser = {
    Physics: { Arcade: { Sprite: MockSprite } },
    Events: { EventEmitter },
    // Az AudioManager ezekre az esemény-konstansokra iratkozik fel; a valódi értékük
    // közömbös, csak stabil stringnek kell lenniük, hogy a teszt ugyanazzal keresse ki
    // a regisztrált callbacket.
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    Sound: { Events: { UNLOCKED: 'unlocked' } },
    Animations: { Events: { ANIMATION_COMPLETE: 'animationcomplete' } },
    // Phaser 4-ben a tint módja külön enum (Phaser 3-ban a setTintFill() kapcsolta).
    // Csak a ténylegesen használt kettő kell; az értékek a valódi Phaser sorrendjét követik.
    TintModes: { MULTIPLY: 0, FILL: 1 },
    Math: {
      // Ugyanaz a lerp-képlet, mint a valódi Phaser.Math.Linear: p0 + (p1 - p0) * t.
      Linear: (p0: number, p1: number, t: number) => p0 + (p1 - p0) * t,
      // Az AudioManager.playSfx() detune-szórása hívja. A valódi Phaser.Math.Between
      // INKLUZÍV mindkét végén — a tesztek tartomány-ellenőrzése erre épül.
      Between: (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min,
      // A MadKing ugrásának vízszintes sebességét korlátozza. A valódi Phaser.Math.Clamp
      // ugyanezt teszi: min <= érték <= max.
      Clamp: (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, value)),
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) =>
          Math.hypot(x2 - x1, y2 - y1),
      },
    },
  };

  return { default: FakePhaser };
}
