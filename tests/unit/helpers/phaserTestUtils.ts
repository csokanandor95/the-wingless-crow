// Megosztott mock-scene/body/segédfüggvények a unit tesztekhez. A 'phaser' modul
// mockolása a vitest.config.ts setupFiles-ében (tests/unit/setup/phaserMock.ts)
// történik globálisan — ez a fájl csak a Player/CrowHarvester/Fireball konstruktorai által
// elvárt scene-felületet és néhány időzítés-vezérlő helpert ad.
import { vi } from 'vitest';
import type Phaser from 'phaser';

export function createMockBody() {
  return {
    velocity: { x: 0, y: 0 },
    // left/right: a boss charge-ja ebből olvassa ki, hogy falnak ütközött-e.
    blocked: { down: false, left: false, right: false },
    touching: { down: false },
    checkCollision: { down: true },
    enable: true,
    setAllowGravity: vi.fn(),
    setSize: vi.fn(),
    // A Player konstruktora ezzel illeszti a bodyt a 128x64-es sprite frame-en belüli
    // rajzolt karakterre.
    setOffset: vi.fn(),
    reset: vi.fn(),
  };
}

function createMockZone() {
  const data = new Map<string, unknown>();
  return {
    body: null,
    // Stateful: a Player attack-hitboxa setData('damage', ...)-vel ír, a
    // Level1Scene (és a tesztek) getData('damage')-vel olvassák vissza.
    setData: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    }),
    getData: vi.fn((key: string) => data.get(key)),
  };
}

export interface MockSound {
  key: string;
  volume: number;
  isPlaying: boolean;
  play: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

// A Phaser hangobjektumának minimális mása: annyit tud, amennyit az AudioManager használ.
// A `volume` sima mező, mert a fade-et tween írja (`targets: sound, volume: ...`).
export function createMockSound(key: string): MockSound {
  const sound: MockSound = {
    key,
    volume: 0,
    isPlaying: false,
    play: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
  };

  sound.play.mockImplementation(() => {
    sound.isPlaying = true;
    return true;
  });
  sound.stop.mockImplementation(() => {
    sound.isPlaying = false;
    return true;
  });
  sound.destroy.mockImplementation(() => {
    sound.isPlaying = false;
  });

  return sound;
}

/**
 * Laza tween-konfig típus a mockhoz. Azért kell explicit paramétertípus a `tweens.add`
 * mockon, mert paraméter nélküli `vi.fn()` esetén a `mock.calls` üres tuple-ként (`[]`)
 * tipizálódik, és a tesztek nem tudják kiolvasni belőle a konfigot.
 */
export interface MockTweenConfig {
  targets?: unknown;
  duration?: number;
  onComplete?: () => void;
  [key: string]: unknown;
}

function createMockTween() {
  return { stop: vi.fn() };
}

/**
 * Az `add.image()` minimális mása az AfterImageTrail-hez: minden setter láncolható, és a
 * beállított értékek visszaolvashatók, hogy a teszt ellenőrizhesse a forrás sprite
 * geometriájának (origin, flip, scale) átmásolását.
 */
export interface MockImage {
  x: number;
  y: number;
  texture: string;
  frame: string | number;
  originX: number;
  originY: number;
  flipX: boolean;
  scaleX: number;
  scaleY: number;
  depth: number;
  alpha: number;
  tint: number | null;
  destroyed: boolean;
  setOrigin(x: number, y: number): MockImage;
  setFlipX(v: boolean): MockImage;
  setScale(x: number, y: number): MockImage;
  setDepth(v: number): MockImage;
  setAlpha(v: number): MockImage;
  setTint(v: number): MockImage;
  destroy(): void;
}

export function createMockImage(
  x: number,
  y: number,
  texture: string,
  frame: string | number
): MockImage {
  const image: MockImage = {
    x,
    y,
    texture,
    frame,
    originX: 0.5,
    originY: 0.5,
    flipX: false,
    scaleX: 1,
    scaleY: 1,
    depth: 0,
    alpha: 1,
    tint: null,
    destroyed: false,
    setOrigin(ox, oy) {
      image.originX = ox;
      image.originY = oy;
      return image;
    },
    setFlipX(v) {
      image.flipX = v;
      return image;
    },
    setScale(sx, sy) {
      image.scaleX = sx;
      image.scaleY = sy;
      return image;
    },
    setDepth(v) {
      image.depth = v;
      return image;
    },
    setAlpha(v) {
      image.alpha = v;
      return image;
    },
    setTint(v) {
      image.tint = v;
      return image;
    },
    destroy() {
      image.destroyed = true;
    },
  };

  return image;
}

function createMockText() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text: any = {
    setPosition: vi.fn(() => text),
    setText: vi.fn(() => text),
    setOrigin: vi.fn(() => text),
    setVisible: vi.fn(() => text),
  };
  return text;
}

export function createMockScene() {
  return {
    add: {
      existing: vi.fn(),
      zone: vi.fn(() => createMockZone()),
      text: vi.fn(() => createMockText()),
      image: vi.fn((x: number, y: number, texture: string, frame: string | number) =>
        createMockImage(x, y, texture, frame)
      ),
    },
    physics: {
      add: {
        existing: vi.fn((obj: { body: unknown }) => {
          obj.body = createMockBody();
        }),
      },
    },
    // NEM fut le automatikusan — a teszt dönti el, mikor "telik el" az idő
    // a felvett callback(ok) manuális meghívásával (lásd a helperek lentebb).
    // A `now` sima, ÍRHATÓ mező: az AfterImageTrail ebből throttle-öl, a teszt pedig
    // ennek léptetésével szimulálja az idő múlását.
    time: { delayedCall: vi.fn(), now: 0 },
    // A tween mock tweent AD VISSZA (nem undefined-ot), mert az AudioManager eltárolja és
    // `stop()`-olja a futó fade-et. A `flushLastTween()` a hívás ARGUMENTUMAIBÓL olvas,
    // ezért ez a többi tesztet nem érinti.
    tweens: { add: vi.fn((_config: MockTweenConfig) => createMockTween()) },
    // A Phaser SoundManager game-szintű; az AudioManager innen kér hangot, és a scene
    // `events`-én keresztül iratkozik fel a shutdownra.
    sound: {
      locked: false,
      add: vi.fn((key: string, _config?: { loop?: boolean; volume?: number }) =>
        createMockSound(key)
      ),
      once: vi.fn((_event: string, _callback: () => void) => undefined),
    },
    events: { once: vi.fn((_event: string, _callback: () => void) => undefined) },
  };
}

export type MockScene = ReturnType<typeof createMockScene>;

// A `body` deklarált típusa `Body | StaticBody | null` (a src/ osztályok is
// `as Phaser.Physics.Arcade.Body` cast-tal szűkítik) — ugyanígy szűkít a teszt is,
// hogy a mock bodyn beállított mezőket (velocity, blocked, ...) típushelyesen tudja
// olvasni. Generikus: bármely Phaser.Physics.Arcade.Sprite-ra használható.
export function getBody(obj: { body: unknown }): Phaser.Physics.Arcade.Body {
  return obj.body as Phaser.Physics.Arcade.Body;
}

/**
 * Lépésenkénti delayedCall-vezérlés: minden `.next()` a *következő még le nem
 * futtatott* ütemezett hívást futtatja le, regisztrációs sorrendben. Ez kell az olyan
 * EGYMÁSBA ÁGYAZOTT delayedCall-láncokhoz, mint a CrowHarvester.startAttack() (startup →
 * a callbackjén belül cooldown) — csak így figyelhető meg a köztes állapot
 * (pl. COOLDOWN a CHASE előtt).
 *
 * `skipExisting: true` esetén a kurzor a MÁR ütemezett hívások mögé áll — ez kell, ha a
 * teszt előkészítése (pl. a boss Phase 2-be sebzése) maga is ütemez callbackeket, amiket
 * nem akarunk beleszámolni a megfigyelt lépésekbe.
 */
export function createDelayedCallStepper(scene: MockScene, skipExisting = false) {
  let cursor = skipExisting ? scene.time.delayedCall.mock.calls.length : 0;
  return {
    next(): void {
      const calls = scene.time.delayedCall.mock.calls;
      if (cursor >= calls.length) {
        throw new Error('Nincs több ütemezett delayedCall a lépéshez.');
      }
      const [, callback] = calls[cursor] as [number, () => void];
      cursor++;
      callback();
    },
    /**
     * A kurzortól a végéig lefuttat mindent (beleértve a futtatás közben újonnan
     * ütemezetteket is), anélkül hogy a már `.next()`-tel lefuttatott hívásokat
     * újra elsütné. Arra kell, amikor két objektum (pl. CrowHarvester + Player) UGYANAZT
     * a scene-t osztja meg, és egymásba ágyazva/összefonódva ütemeznek
     * delayedCall-okat — ilyenkor a köztes állapotot `.next()`-tel figyeljük meg,
     * a többit meg egyszerűen lefuttatjuk.
     */
    flushRemaining(): void {
      const calls = scene.time.delayedCall.mock.calls;
      for (; cursor < calls.length && cursor < 1000; cursor++) {
        const [, callback] = calls[cursor] as [number, () => void];
        callback();
      }
    },
  };
}

/**
 * KÉSLELTETÉS SZERINTI, szelektív delayedCall-futtatás.
 *
 * A `createDelayedCallStepper` REGISZTRÁCIÓS sorrendben halad, ami néhány forgatókönyvben
 * túl merev: a boss egy támadásnál több, KÜLÖNBÖZŐ hosszúságú callbacket is ütemez
 * egyszerre (pl. a lövedék 500ms-os startupját ÉS a 2200ms-os újratöltését), és a teszt
 * pont azt akarja megnézni, mi történik, ha az egyik már lefutott, a másik még nem —
 * mert így jut el a boss a lövedékről a Shadow Spellre.
 *
 * A `run(delayMs)` mindig a megadott késleltetéssel ütemezett, még LE NEM FUTTATOTT első
 * callbacket süti el, tehát ugyanazzal a hosszal ütemezett hívások időrendben jönnek.
 */
export function createDelayedCallRunner(scene: MockScene) {
  const fired = new Set<number>();

  return {
    run(delayMs: number): void {
      const calls = scene.time.delayedCall.mock.calls as Array<[number, () => void]>;

      for (let i = 0; i < calls.length; i++) {
        if (fired.has(i) || calls[i][0] !== delayMs) continue;
        fired.add(i);
        calls[i][1]();
        return;
      }

      throw new Error(`Nincs le nem futtatott delayedCall ${delayMs}ms késleltetéssel.`);
    },
  };
}

/**
 * Az összes eddig ütemezett delayedCall lefuttatása, beleértve a futtatás KÖZBEN
 * újonnan ütemezetteket is — arra jó, ha a köztes állapot nem érdekes, csak a
 * végeredmény (pl. a Player egyszerű, nem ágyazott HURT->DEAD láncához elég).
 */
export function flushAllDelayedCalls(scene: MockScene): void {
  const calls = scene.time.delayedCall.mock.calls;
  for (let i = 0; i < calls.length && i < 1000; i++) {
    const [, callback] = calls[i] as [number, () => void];
    callback();
  }
}

/** A legutóbb elindított tween `onComplete`-jének manuális lefuttatása. */
export function flushLastTween(scene: MockScene): void {
  const calls = scene.tweens.add.mock.calls;
  const config = calls[calls.length - 1][0] as { onComplete?: () => void };
  config.onComplete?.();
}
