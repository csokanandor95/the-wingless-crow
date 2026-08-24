/**
 * Környezeti sebzés-kapu (i-frame ablak).
 *
 * **Miért kell:** a `Player.takeDamage()` szándékosan NEM ellenőrzi a HURT állapotot, csak a
 * DEAD-et — egy enemy-csapás ugyanis diszkrét esemény, ott ez helyes. Egy KÖRNYEZETI hazard
 * viszont folyamatos érintkezés: tüskén állva vagy a lengő kaszába érve a scene minden
 * frame-ben (60×/s) sebezné a playert, és a 100 HP kevesebb mint két másodperc alatt elfogyna.
 *
 * A playernek nincs általános sebezhetetlenségi rendszere, és ez a kapu a legkisebb
 * változtatás, ami ezt megoldja anélkül, hogy a `Player`-hez hozzányúlnánk.
 *
 * Szándékosan PURE, Phaser-mentes osztály (a hívó adja az időt), hogy mockolás nélkül
 * unit-tesztelhető legyen — ugyanaz az elv, mint a `ParallaxBackground`
 * `tilePositionForScroll()`-jánál.
 */

/**
 * Egy környezeti találat után ennyi ideig nem sebez újra SEMMILYEN hazard.
 *
 * A 900 ms-nak gameplay-jelentése van: a 128 px-es spike-mezőn `MOVE_SPEED` (200 px/s)
 * mellett 640 ms átgyalogolni, tehát egy nekifutásból való átkelés PONTOSAN egy találatot ér.
 * A tüskék így tanítanak, nem büntetnek — a D szakasz tutorial.
 */
export const HAZARD_INVULNERABILITY_MS = 900;

export default class HazardDamageGate {
  /** null = még sosem sebződött ebből a forrásból (nem -Infinity: az NaN-t szülhet). */
  private lastHitAt: number | null = null;

  canDamage(nowMs: number): boolean {
    return this.lastHitAt === null || nowMs - this.lastHitAt >= HAZARD_INVULNERABILITY_MS;
  }

  register(nowMs: number): void {
    this.lastHitAt = nowMs;
  }

  /** Respawnkor: az új élet ne örökölje az előző halál i-frame-jeit. */
  reset(): void {
    this.lastHitAt = null;
  }
}
