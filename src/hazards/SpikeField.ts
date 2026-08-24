import Phaser from 'phaser';
import {
  GROUND_TOP,
  SPIKE_HEIGHT,
  SPIKE_HITBOX_INSET_X,
  SPIKE_TILE_WIDTH,
  type SpikeFieldDef,
} from '../levels/Level1Layout';

/**
 * Statikus tüskemezők (Level 1, D szakasz).
 *
 * A látvány és a hitbox KÜLÖN objektum — ugyanaz a minta, mint a létránál: egy `tileSprite`
 * csempézi a tüske-grafikát a mező teljes hosszában, a sebzést pedig egyetlen, static bodyval
 * ellátott `Zone` adja. Ez azért fontos, mert így a `SPIKE_HITBOX_INSET_X` behúzás a MEZŐ
 * egészére vonatkozik: csempénkénti bodyk mellett a behúzások sebezhetetlen réseket nyitnának
 * a tüskék KÖZÖTT, ahol a player büntetlenül megállhatna.
 *
 * A mezők NEM ütköznek a playerrel (csak overlap): a tüskéken át lehet gyalogolni, csak
 * sebzés árán. Az enemyket sem sebzik — a CrowHarvesterek patrol-határai eleve nem érnek
 * a mezőkig (`level1Layout.test.ts` őrzi).
 */

/** Egy tüske-találat sebzése. */
export const SPIKE_DAMAGE = 15;

/**
 * Visszalökés találatkor — CSAK függőleges.
 *
 * Volt egy vízszintes összetevő is (a mező közelebbi széle felé, „arra, amerről jött"), de
 * manuális teszten kiderült, hogy az **saját magának okoz egy második találatot**: a
 * hátrafelé tolás ~36 px-nyi haladást és ~150 ms-ot vesz el, amitől az átkelés 970 ms-ra
 * nyúlik — túl a 900 ms-os i-frame ablakon. A player tehát egyetlen hibáért kétszer fizetett,
 * és a másodikat a játék reakciója okozta: pont az, amit a layout-spec „avoid unavoidable
 * damage" pontja tilt.
 *
 * Vízszintes lökés nélkül a lendület megmarad (a `Player` HURT-lockja nem nyúl a
 * velocityhez), az átkelés 128px / 200 px/s = 640 ms, és PONTOSAN egy találatot ér.
 * A függőleges pop marad: az emeli ki a playert a tüskékből, és az adja a „megrándul" érzetet.
 */
export const SPIKE_KNOCKBACK_Y = -260;

export default class SpikeField {
  private readonly zones: Phaser.GameObjects.Zone[] = [];

  constructor(scene: Phaser.Scene, defs: SpikeFieldDef[]) {
    for (const def of defs) {
      const width = def.endX - def.startX;
      const centerX = def.startX + width / 2;
      // A tüskék a talaj FELSZÍNÉN állnak: az aljuk pontosan a GROUND_TOP-on.
      const centerY = GROUND_TOP - SPIKE_HEIGHT / 2;

      scene.add
        .tileSprite(centerX, centerY, width, SPIKE_HEIGHT, 'spike-placeholder')
        .setDepth(-1);

      const zone = scene.add.zone(
        centerX,
        centerY,
        Math.max(width - 2 * SPIKE_HITBOX_INSET_X, SPIKE_TILE_WIDTH / 2),
        SPIKE_HEIGHT
      );
      scene.physics.add.existing(zone, true);

      this.zones.push(zone);
    }
  }

  /**
   * A sebző zónák. A hívó scene SZINKRON `physics.overlap()`-pel teszteli őket (mint a
   * létrát és az ajtót), nem `physics.add.overlap` callbackkel — utóbbi csak a scene
   * `update()`-je UTÁN futna le, ami egy frame késést vinne a sebzésbe.
   *
   * A zóna `x`-e a mező középpontja: a hívó ebből számítja a visszalökés irányát.
   */
  getZones(): readonly Phaser.GameObjects.Zone[] {
    return this.zones;
  }
}
