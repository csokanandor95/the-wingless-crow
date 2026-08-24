/**
 * Game-szintű fizikai konstansok.
 *
 * A gravitáció korábban literálként élt a `main.ts` Phaser konfigjában. Azért került külön
 * modulba, mert a `levels/Level1Layout.ts` ebből (és a Player exportált `MOVE_SPEED` /
 * `JUMP_VELOCITY` konstansaiból) SZÁMOLJA ki a maximális ugrásmagasságot és -távolságot —
 * a `main.ts`-t viszont nem importálhatja, mert annak a betöltése létrehozná a
 * `Phaser.Game` példányt.
 *
 * Ha ez az érték változik, a Level 1 minden szakadéka és platform-emelkedése átméreteződik;
 * a `tests/unit/level1Layout.test.ts` invariánsai pont ezt őrzik.
 */
export const GRAVITY_Y = 800;
