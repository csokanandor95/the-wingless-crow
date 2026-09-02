export enum AttackType {
  SWORD = 'SWORD',
  HEAVY = 'HEAVY',
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

// A playernek KÉT kardtámadása van: a gyors alapcsapás (SWORD) és a ritka, nagy hatótávú
// HEAVY. A Record szerkezete pont ezért maradt meg egyetlen taggal is — a bővítés egy új
// AttackType tag + egy új bejegyzés volt.
//
// A startupDelayMs + activeDurationMs egyben a támadás ANIMÁCIÓJÁNAK is a hossza
// (PlayerAnimations.ts a frameRate-et ebből számolja), ezért a hangolásuk egyszerre
// gameplay- és animáció-döntés: 330ms / 5 frame = 15 fps, a hitbox a 150ms-os startup
// után (a csapás frame-jén) nyílik.
//
// A cooldownMs szándékosan NEM kisebb az animáció hosszánál — különben nem a cooldown
// lenne a valódi kapu, hanem az ATTACK state-lock, és a szám félrevezetővé válna.
//
// A hitbox MÉRETEI a tényleges animáció-kiterjedésből származnak: az Attacks.png aktív
// frame-jeinek (f17-f19) alpha bounding boxa, a player középpontjához viszonyítva — az ív
// +63px-ig ér, ezért a hitbox +9..+59. Ha valaha más frame-tartomány kerül a támadáshoz
// (PlayerAnimations.ts ATTACK_FRAMES), ezt EGYÜTT kell újraszámolni — különben a hitbox
// a kard előtt/mögött a levegőt találja el.

/**
 * A félhold-hullám MÉRT sávhossza az Attacks.png f15-f19 frame-jein.
 *
 * Az oszlop-hisztogram szerint a lovag TESTE a frame x 47..76 sávjában van (a player
 * középpontja a frame x=64, mert originX 0.5), a levált hullám pedig innen fut ki a frame
 * jobb széléig (x=127). Világ-koordinátában tehát a hullám a **+12 .. +63** sávot tölti ki,
 * ami **51 px**. (Az f17-f19-en tisztán látszik a leválás: x 76..88, 76..94, 76..108 üres.)
 *
 * Ez a HEAVY EGYETLEN új geometriai konstansa: ennyivel előrébb rajzoljuk a második
 * hullámot (PlayerAnimations.ARC_CROP_X), és ennyivel nyúlik meg a hitbox is — így a
 * látvány és a találati sáv EGYÜTT duplázódik, kézi hangolás nélkül.
 */
export const HEAVY_ECHO_OFFSET_PX = 51;

/**
 * Hány BEÉRKEZETT alapcsapás tölt fel egy HEAVY-t. A heavy-nek nincs saját, magától lejáró
 * cooldownja: kizárólag közelharccal kereshető meg, ez kényszeríti a playert a kard
 * használatára a tűzgolyó helyett.
 */
export const HEAVY_CHARGE_HITS = 3;

const SWORD_CONFIG: AttackConfig = {
  damage: 10,
  cooldownMs: 350,
  startupDelayMs: 150,
  activeDurationMs: 180,
  hitboxWidth: 50,
  hitboxHeight: 46,
  hitboxOffsetX: 34,
};

// A HEAVY ugyanaz a csapás, csak a hullám még egyszer megjelenik egy sávnyival előrébb
// (lásd HEAVY_ECHO_OFFSET_PX) — tehát kétszer olyan messzire ér el.
//
// A hitbox NEM szabadon hangolt: a sáv hosszával tolódik ki, ezért a kard +9..+59-e
// +9..+110-re nő. Önellenőrző: a kard látványa +63-ig ér a +59-es hitbox mellett (4 px
// behúzás a távoli végén), a heavyé +114-ig a +110-es hitbox mellett — UGYANAZ a 4 px.
//
// A cooldownMs LEVEZETETT, és ez biztosítja, hogy a player ne legyen ERŐSEBB, csak
// változatosabb. A heavy HEAVY_CHARGE_HITS beérkezett alapcsapásból tölt, tehát a teljes
// ciklus 3 kard + 1 heavy; a feltétel az, hogy ennek a dps-e ne haladja meg a tiszta kardét:
//
//   (3*10 + 22) / (3*350 + C)  <=  10/350     ->     C >= 770     ->     C = 800
//
// Eredmény: 52 sebzés / 1850 ms = 28,1 dps, szemben a tiszta kard 28,6 dps-ével. A heavy
// tehát egy hajszálnyi dps-t ad fel HATÓTÁVÉRT és burst-ért. Unit teszt őrzi ezt az
// egyenlőtlenséget — egy későbbi "veszek fel egy kis sebzést" hangolás a CI-ban bukik.
const HEAVY_CONFIG: AttackConfig = {
  damage: 22,
  cooldownMs: 800,
  // A kard 150 ms-os windupjának duplája: a heavy elkötelezettség, nem reflex.
  startupDelayMs: 300,
  activeDurationMs: SWORD_CONFIG.activeDurationMs,
  hitboxWidth: SWORD_CONFIG.hitboxWidth + HEAVY_ECHO_OFFSET_PX,
  hitboxHeight: SWORD_CONFIG.hitboxHeight,
  hitboxOffsetX: SWORD_CONFIG.hitboxOffsetX + HEAVY_ECHO_OFFSET_PX / 2,
};

export const ATTACK_CONFIGS: Record<AttackType, AttackConfig> = {
  [AttackType.SWORD]: SWORD_CONFIG,
  [AttackType.HEAVY]: HEAVY_CONFIG,
};