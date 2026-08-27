# Level 2 – Layout
## Phaser implementációs pályaterv

> **Státusz:** tervezet, implementáció előtt.
> **Ez a dokumentum rögzíti:** logikai felépítés, szakaszsorrend, geometria, platform-,
> enemy- és hazard-placement, invariánsok, elfogadási kritériumok.
> **Ez a dokumentum NEM rögzíti:** téma (erdő / dungeon / kripta), tileset, háttér,
> parallax, zene, hangok, lore, feliratok szövege. Ezek külön iterációban jönnek, és
> a jelen geometriát nem befolyásolják.

---

## 1. Általános

- Logikai felbontás: **800×450**
- `GROUND_TOP = 418` (mint Level 1)
- `WORLD_WIDTH = 7200` (Level 1: 6000)
- Side-scrolling, a pálya balról jobbra halad, a kamera a playert követi.
- **Nincs függőleges kameragörgetés** (mint Level 1): a teljes pálya belefér a 450 px-es
  sávba. A legmagasabb felület a talaj fölött **+300 px** (y = 118) — efölé nem megyünk.
- A FIZIKAI világ mélyebb a canvasnál (`WORLD_HEIGHT + FALL_DEPTH`), a zuhanás-halált a
  `FALL_DEATH_Y` küszöb adja — változatlan Level 1-hez képest.
- Belépés: Boss 1 győzelem → `NarrationScene` → `Level2Scene`. Player start: **x ≈ 120**,
  a `G1` talajszegmensen.
- Kilépés: a pálya végén boss-ajtó → `Boss2Scene`.

**Magasság-jelölés:** minden platformnál `+N` = a felület teteje N pixellel a talaj fölött,
azaz `top = GROUND_TOP − N`. A megadott x/N értékek **kiindulási javaslatok**; a végső
igazságot a 20. pontban leírt unit teszt adja.

---

## 2. Viszonyítás a Level 1-hez

| | Level 1 | Level 2 (terv) |
|---|---:|---:|
| Hossz | 6000 px | **7200 px** |
| Talajszegmens | 5 | 4 |
| Szakadék | 4 (rövid) | **3 (750–960 px, egyik sem ugorható át)** |
| Statikus platform | 14 | **19** |
| Mozgó platform | 0 | **4** *(új elem, lásd 4. pont)* |
| Tüskemező | 1 | **7** |
| Swinging Reaper | 1 | **3** |
| CrowHarvester | 7 | **10** |
| Gravecaller | 2 | **4** |
| Köztes checkpoint | 1 | **3** |
| Talajszintű „átfutó" sáv | végig létezik | **három szakaszon egyáltalán nincs** |

A cél nem a méret, hanem a **sűrűség**: a Level 1 hosszú, üres talajszakaszai eltűnnek.

Megjegyzés: a 3. enemy típus ( Beast / Hound ) még nincs implementálva, így nem szerepel a tervben, de később lehet, hogy hozzáadjuk a pályához. 

---

## 3. Level flow

```text
START (G1 talaj)
  ↓
A – Bemelegítés (1 közelharci enemy, hazard nélkül)
  ↓
B – Mozgó platform bevezetése (biztonságos kontextusban, enemy nélkül)
  ↓
C – Tüskeritmus + szorított földi harc  (4 tüskemező, 2 CrowHarvester)
  ↓
[ CHECKPOINT 1 ]
  ↓
D – Emelkedő szakadék caster-tűz alatt (mozgó platform + 3 lépcső + 1 Gravecaller)
  ↓
E – Talajszintű kombinált harc (spike + reaper-emlékeztető + crow&caster páros)
  ↓
E vége – függőleges lift a felső párkányra
  ↓
[ CHECKPOINT 2 ]
  ↓
F – Kettős kaszás szakadék (2 Swinging Reaper ELLENFÁZISBAN, 960 px mélység)
  ↓
[ CHECKPOINT 3 ]
  ↓
G – Záró kombinált aréna (2 útvonal: földi harc VAGY lőtt felső platformsor)
  ↓
H – Emelkedés két létrán, őrzött párkánnyal
  ↓
I – Boss-előtér: biztonságos párkány + checkpoint + boss ajtó
  ↓
Boss2Scene
```

Megjegyzés: a 3 darab checkpoint szinte biztos, hogy sok, és az implementálás és manuális tesztelés után majd csökkenteni fogjuk a számát. Fejlesztés és a tesztelés idejére viszont mehet a 3 darab.

---

## 4. Új elem: mozgó platform — **ELTÉRÉS a projektterv.md-től**

A `projektterv.md` **13. pontja** (Platforming) felsorolja az engedélyezett elemeket:
ground, platform, gap, lépcsős platform, magasabb platform, egyszerű akadályok, létra,
egyirányú platform. **A mozgó platform NINCS köztük.**

Ez tehát új gameplay-mechanika, amit a `level1-layout.md` 11. pontjának megfelelője
(„Do not introduce additional gameplay mechanics unless explicitly requested") csak
kifejezett kérésre enged — a kérés megtörtént. **Teendő: a projektterv.md 13. pontját
frissíteni kell**, és a Phase 8 / „Level 2" bejegyzésnél megemlíteni.

Amit a mechanika **nem** hoz magával (scope-védelem):

- nem lesz gomb/kapcsoló-vezérelt platform,
- nem lesz eltűnő/omló platform,
- nem lesz körpályás vagy gyorsuló mozgás,
- a player képességei **nem** változnak (nincs dash, double jump, wall jump).

**Viselkedés-specifikáció:**

| jellemző | érték / szabály |
|---|---|
| pálya | egyenes szakasz, vízszintes **vagy** függőleges |
| mozgásprofil | **determinisztikus, pure függvény az eltelt időből** (`platformOffsetAt`) — ugyanaz az elv, mint a `swingAngleAt`-nál; `Phaser.Math.Between` tilos |
| sebesség | vízszintes 60–70 px/s, függőleges 45 px/s (a player 200 px/s-jéhez képest lassú és kiszámítható) |
| megállás a végpontokon | 0,4 s várakozás mindkét szélsőállásban — enélkül a felugrás pillanata nem gyakorolható |
| player szállítása | a playernek **együtt kell mozognia** a platformmal (lásd 19. pont, Arcade-specifikus tétel) |
| enemy szállítása | **nem** — mozgó platformra enemy nem kerül |
| halál/respawn | a platform pozíciója a scene-idő függvénye, tehát respawn után magától a helyes fázisban van |

---

## 5. Geometriai kiindulás (levezetett, nem szemre becsült)

A `Player.MOVE_SPEED = 200`, `JUMP_VELOCITY = −500`, `GRAVITY_Y = 800` értékekből
(Level 1 Redesign óta a `Level1Layout.ts` már így számol):

- max ugrásmagasság: **156 px**
- max ugrástáv sík terepen: **250 px**
- biztonsági szorzó: szakadékra **0.7**, emelkedésre **0.75**

A `horizontalReachForRise()` táblázata — **ezekhez kell tervezni**:

| emelkedés (px) | elméleti hatótáv | **tervezési korlát (×0.7)** |
|---:|---:|---:|
| 0 (sík) | 250 | **175** |
| 40 | 233 | **163** |
| 80 | 212 | **148** |
| 117 (a 0.75-ös magasság-plafon) | 188 | **131** |

**Ebben a pályában használt szabvány-lépések:**

- vízszintes hézag azonos magasságban: **120 px** (a `F` szakasz teljes egészében ilyen —
  így a kihívás az IDŐZÍTÉS, nem a távolság)
- emelkedő lépcső: **max +60 px emelkedés / 120 px hézag**
- egyetlen lépésben soha nem megyünk +117 fölé

---

## 6. Miért nem lehet átszaladni (a Level 1 legfőbb hibája)

Öt egymástól független mechanizmus, szándékosan:

1. **Három hosszú szakadék** (750 / 800 / 960 px) — mindegyik többszöröse a 250 px-es
   ugrás-plafonnak, tehát platformmunka nélkül nincs átjutás.
2. **A `D` és `F` szakasz alatt egyáltalán nincs talajszint** — nincs alternatív útvonal.
3. **A `C` és `G` talajsávját tüskemezők tagolják** — a futósáv szaggatott.
4. **Két Gravecaller a TALAJON áll** (`E-caster-1`, `G-caster-1`), tehát a futósáv maga is
   lőtt terület. Ez **tudatos megfordítása** a Level 1-es döntésnek, ahol a `G5` talaj
   szándékosan kimaradt a caster hatóköréből.
5. **A `C` és `G` opcionális felső platformjai NEM láncolhatók** — a köztük lévő táv
   nagyobb, mint a hatótáv az adott emelkedésnél. Nincs ingyen „skyway", ami átvinne a
   szakasz fölött.

---

## 7. Section A – Bemelegítés (x 0 – 900)

**Cél:** visszatérés az irányításba egy győztes boss fight után. Nincs tutorial-felirat
(a Level 1 megtanította), nincs hazard.

**Elemek**

| id | típus | x | magasság |
|---|---|---|---|
| `G1` | talaj | 0 – 900 | +0 |
| `A1` | platform | 430 – 560 | +45 |
| `A2` | platform | 640 – 780 | +95 |
| `A-crow-1` | CrowHarvester | patrol 520 – 860 (talaj) | – |

```text
                       ▄▄▄▄  A2
              ▄▄▄▄  A1
 P                      ☠ crow
════════════════════════════════════   G1
0                                  900
```

**Követelmények**

- `A1`/`A2` opcionális: fireball-pozíció az `A-crow-1` ellen, de nem kötelező útvonal.
- Nincs tüske, nincs kasza, nincs zuhanás-halál a szakaszon belül.

---

## 8. Section B – Mozgó platform bevezetése (x 900 – 1700)

**Cél:** az új mechanika megtanítása **büntetés-minimalizált** kontextusban — közel a pálya
elejéhez (a respawn a start), enemy és hazard nélkül. Ugyanaz az elv, mint a Level 1
`A` szakaszának ugrás-gödrénél: a lecke csak akkor tanít, ha a hibának következménye van,
de a következmény olcsó.

**Elemek**

| id | típus | x | magasság | mozgás |
|---|---|---|---|---|
| — | **szakadék** | 900 – 1700 (800 px) | — | zuhanás-halál |
| `B-mover-1` | mozgó platform (96×24) | bal él 940 ↔ 1120 | +50 | vízszintes, 70 px/s |
| `B-pillar` | statikus platform | 1290 – 1390 | +50 | — |
| `B-mover-2` | mozgó platform (96×24) | bal él 1440 ↔ 1520 | +50 | vízszintes, 70 px/s |
| `G2` | talaj | 1700 – 2900 | +0 | — |

```text
        ┌──►┐          ▄▄▄▄        ┌─►┐
   ═════╡   ╞══════════▀▀▀▀════════╡  ╞═════════
   G1   │ mover-1 │   B-pillar   │ mover-2 │  G2
   ─────┴─────────┴──────────────┴─────────┴────
        ╎        800 px szakadék          ╎
        ╎          (halálos)              ╎
```

**Követelmények**

- A `G1` pereméről (x=900) a `B-mover-1` **bal szélső** állásába az ugrás triviális
  (40 px hézag, +50 emelkedés) — a nehézség nem itt van, hanem a **leszállásban**.
- `B-mover-1` jobb szélső állásából (jobb él 1216) a `B-pillar`-ig 74 px.
- `B-pillar`-ról `B-mover-2` bal szélső állásába 50 px.
- `B-mover-2` jobb szélső állásából (jobb él 1616) a `G2` peremig 84 px.
- **Minden ugrás a szélsőállásból van méretezve** — ha a player rossz pillanatban ugrik,
  akkor is legfeljebb egy ciklust kell várnia, sosem kell „menet közben" célozni.
- Enemy: nincs. Hazard: csak a szakadék.

---

## 9. Section C – Tüskeritmus + szorított földi harc (x 1700 – 2900)

**Cél:** a Level 1 egyetlen tüskemezőjének komolyan vétele: a tüske ritmus-elemmé válik,
és a köztük lévő szigetek harctérré.

**Elemek**

| id | típus | x | magasság |
|---|---|---|---|
| `C-spikes-1` | tüskemező | 1820 – 1916 (96) | talajszint |
| `C-spikes-2` | tüskemező | 2040 – 2168 (128) | talajszint |
| `C-spikes-3` | tüskemező | 2300 – 2396 (96) | talajszint |
| `C-spikes-4` | tüskemező | 2520 – 2648 (128) | talajszint |
| `C1` | platform | 1880 – 1980 | +80 |
| `C2` | platform | 2300 – 2400 | +80 |
| `C3` | platform | 2600 – 2700 | +80 |
| `C-crow-1` | CrowHarvester | patrol a 2168–2300 szigeten | – |
| `C-crow-2` | CrowHarvester | patrol 2680 – 2870 | – |

```text
        ▄▄▄▄ C1        ▄▄▄▄ C2        ▄▄▄▄ C3
  ══════════^^^^^══════════^^^^^^^══════^^^^^══════
   G2       sp-1  ☠ sp-2   sp-3         sp-4   ☠
              (crow-1 a szigeten)
```

**Követelmények**

- Egyik tüskemező sem szélesebb **128 px**-nél → ugrással átugorható (korlát 175), tehát
  **tiszta átkelésnél 0 sebzés**. Aki nem ugrik, mezőnként egy találat (15 HP).
- A mezők közötti biztonságos sávok **≥ 120 px** — a `HazardDamageGate` 900 ms-os közös
  i-frame ablaka miatt így két mező találata nem olvad össze, és a player mindig kap
  esélyt a következő ugrás előkészítésére.
- **`C1`–`C3` nem láncolható:** `C1 → C2` = 320 px, `C2 → C3` = 200 px, a hatótáv +80-on
  148 px. Nincs átfutó felső sáv. A perch-ek szerepe: fireball-pozíció.
- `C-crow-1` üldözési határa a szigetére korlátozódik (létező `clampChaseToBounds` +
  spike-kizárás) — a szigetre érkező player harcba landol, de a sziget **132 px**, ami
  elég a landolás utáni fordulásra: a patrol-határ nem érhet a landolópont attack range-én
  belülre. Ezt unit teszt őrzi.

**`CHECKPOINT 1` — x ≈ 2820**, a `G2` biztonságos végén, aktiválás **érintésre** (mint a
Level 1 köztes checkpointja).

---

## 10. Section D – Emelkedő szakadék caster-tűz alatt (x 2900 – 3700)

**Cél:** a Gravecaller-fenyegetés első „komoly" alkalmazása: a lövedék vízszintes, tehát
**a magasságkülönbség maga a mechanika** — ez a Level 2 fő tervezési motívuma
(projektterv.md 14. pont, Level 2 leírása).

**Elemek**

| id | típus | x | magasság | megjegyzés |
|---|---|---|---|---|
| — | **szakadék** | 2900 – 3700 (800 px) | — | nincs alatta talaj |
| `D-mover-1` | mozgó platform | bal él 2960 ↔ 3080 | **+40** | vízszintes, 60 px/s |
| `D1` | platform | 3260 – 3370 | +100 | |
| `D2` | platform | 3440 – 3550 | +155 | **lőtt zóna** |
| `D3` | platform | 3620 – 3690 | +155 | **lőtt zóna** |
| `D-C1` | platform | 3760 – 3880 | +170 | a caster párkánya |
| `D-caster-1` | Gravecaller | `D-C1`-en | — | |
| `G3` | talaj | 3700 – 4600 | +0 | |

```text
                                        ☠ D-caster-1
                              ▄▄▄  ▄▄▄   ▄▄▄▄▄
                        ▄▄▄▄  D2   D3    D-C1
              ┌──►┐     D1
   ═══════════╡   ╞═══════════════════════════════════
   G2         │mover│                          G3
   ───────────┴─────┴───────────────────────────────
              ╎     800 px szakadék      ╎
```

**Követelmények**

- **A `D-mover-1` szándékosan ALACSONYAN (+40) megy:** a `D-caster-1` bolt-sávja
  (`+170` körül, ±26) így **nem metszi a mozgó platform pályáját**. Lásd 19. pont,
  invariáns 4 — mozgó platformon a player nem tud kitérni, ott egy lövedék
  kikerülhetetlen sebzés lenne.
- A `D2 → D3` szakasz **benne van** a bolt sávjában (a `D-C1` +170 és a `D2/D3` +155
  különbsége 15 px, a valódi találati sáv ~±26) → a lény ténylegesen eltalálja az ott
  álló playert. Ez a szakasz lényege: **a lépcsőt tűz alatt kell megmászni.**
- A `D-caster-1` és a `D2` távolsága 260–370 px (< `DETECTION_RANGE` 400) → már a `D2`-re
  érkezéskor észlel.
- A `D3`-ról a `D-C1`-re át lehet ugrani (+15 emelkedés, 70 px hézag) → a caster
  **karddal megölhető**; a `D-C1` 120 px széles, tehát sarokba szorítva tüzel, nem válik
  bábuvá (dokumentált viselkedés).
- A `D3`-ról a `G3` talajra **leugrással** lehet menekülni (−155) — a lefelé ugrás
  hatótávja mindig nagyobb, tehát a menekülés mindig nyitva áll.
- **A talajszinten (+0) a caster nem talál** (170 px eltérés), tehát a `G3`-ra érve a
  fenyegetés megszűnik — a szakasznak van olvasható vége.

---

## 11. Section E – Talajszintű kombinált harc + lift (x 3700 – 4600)

**Cél:** (a) a Swinging Reaper visszavezetése **nem halálos** kontextusban, (b) az első
crow + caster páros, (c) a függőleges mozgó platform bemutatása.

**Elemek**

| id | típus | x | magasság |
|---|---|---|---|
| `E-crow-1` | CrowHarvester | patrol 3850 – 3980 (talaj) | – |
| `E-spikes-1` | tüskemező | 4000 – 4128 (128) | talajszint |
| `E-reaper-1` | Swinging Reaper | horgony x = 4064 | a tüskemező fölött söpör |
| `E-caster-1` | Gravecaller | **talajon**, patrol 4180 – 4280 | +0 |
| `E-crow-2` | CrowHarvester | patrol 4300 – 4430 (talaj) | – |
| `E-lift` | mozgó platform (96×24) | x fix 4430 – 4526 | **függőleges**, +20 ↔ +150, 45 px/s |
| `E-ledge` | platform | 4520 – 4660 | +160 |

```text
                    ●  E-reaper-1
                    │
                   ╲                                  ▄▄▄▄▄▄ E-ledge
                    ☠                              ▲
   ══════════^^^^^^^^^^^^^^═══════════════════════ ▐▌ lift
   G3   ☠crow-1   E-spikes-1     ☠caster-1  ☠crow-2 ▼
```

**Követelmények**

- A kasza a **tüskemező fölött** söpör, tehát a rossz időzítés ára tüske- **vagy**
  kasza-találat — **de sosem mindkettő**: a `HazardDamageGate` 900 ms-os ablaka minden
  környezeti hazardra KÖZÖS. Ez teszi a kombinációt tisztességessé, és pontosan ezért lehet
  itt a kasza „emlékeztető": a hiba ára 20 HP, nem halál.
- A kasza szélsőállásban legalább **150 px**-re legyen a két part álló-pozíciójától
  (mint Level 1-ben) → a mintát biztonságból végig lehet nézni.
- `E-caster-1` a **talajon** áll → a futósávot lövi. `E-crow-2` közvetlenül mögötte:
  a player egyszerre kap távolsági és közelharci nyomást. A caster `RETREAT_SPEED` 70 ≪
  player 200, tehát a „berohanok és lekaszabolom" válasz működik — ez a szándék.
- `E-lift`: az egyetlen út a `F` szakaszba. Alatta **talaj van**, tehát a leesés nem halál —
  a függőleges mozgó platform is biztonságos kontextusban debütál.
- A lift amplitúdója (130 px) tudatosan kicsi: nincs függőleges kameragörgetés.

**`CHECKPOINT 2` — az `E-ledge`-en, x ≈ 4580.** Így az `F`-ben elhalálozó player **nem
kényszerül újra liftezni**.

---

## 12. Section F – Kettős kaszás szakadék (x 4600 – 5560)

**Cél:** a pálya csúcspontja tisztán időzítésből. **Két Swinging Reaper ELLENFÁZISBAN.**

**Elemek**

| id | típus | x | magasság |
|---|---|---|---|
| — | **szakadék** | 4600 – 5560 (960 px) | zuhanás-halál |
| `F1` | platform | 4780 – 4920 | +150 |
| `F2` | platform | 5040 – 5180 | +150 |
| `F3` | platform | 5300 – 5440 | +150 |
| `F-reaper-1` | Swinging Reaper | horgony x = 4980 | az 1. hézag fölött |
| `F-reaper-2` | Swinging Reaper | horgony x = 5240 | a 2. hézag fölött, **fázisoffset = félperiódus** |

```text
        ●                 ●
        │                 │
       ╲                 ╱
        ☠               ☠
  ▄▄▄▄  ▄▄▄▄▄▄    ▄▄▄▄▄▄   ▄▄▄▄▄▄       ═══════
  ledge   F1        F2       F3          G4
  ╎                                    ╎
  ╎         960 px szakadék            ╎
```

**Követelmények**

- **Minden hézag pontosan 120 px, azonos magasságban** (korlát 131). A távolság így
  konstans és megtanulható — a változó egyedül a fázis.
- **A két kasza ellenfázisban jár**, tehát a két hézagot NEM lehet egy lendülettel,
  ugyanabban a ritmusban átugrani: **az `F2`-n meg kell állni és újra időzíteni.** Ez a
  szakasz lényege, és egyben a Level 1-es egyetlen kaszához képest a valódi újdonság.
- Mindkét kasza szélsőállásban legalább 150 px-re legyen a szomszédos platform
  álló-pozíciójától → mindhárom platformon biztonságos a várakozás.
- **Nincs visszalökés** (mint Level 1-ben) — 960 px szakadék fölött bármilyen lökés
  kikerülhetetlen halált okozna.
- **Nincs enemy a szakaszon.** Indoklás: két független időzítés már önmagában a szakasz
  leckéje; egy lövedék vagy egy közelharci lökés itt olyan halált okozna, amire nem lehet
  reagálni. Ugyanaz a hibaosztály, mint a tüskék vízszintes visszalökése volt Level 1-ben
  („avoid unavoidable damage").
- Tiszta átkelés: **0 sebzés**. Rossz fázis: kaszánként 20.

**`CHECKPOINT 3` — x ≈ 5620**, közvetlenül az `F` után, a `G4` talajon. *(Vitatható,
lásd 22. pont.)*

---

## 13. Section G – Záró kombinált aréna (x 5560 – 6400)

**Cél:** a pálya legsűrűbb harci szakasza, **két valódi útvonallal** — mindkettőnek ára van.

**Elemek**

| id | típus | x | magasság |
|---|---|---|---|
| `G4` | talaj | 5560 – 7200 | +0 |
| `G-spikes-1` | tüskemező | 5800 – 5896 (96) | talajszint |
| `G-spikes-2` | tüskemező | 6100 – 6228 (128) | talajszint |
| `G-crow-1` | CrowHarvester | patrol 5650 – 5780 | 1. cella |
| `G-crow-2` | CrowHarvester | patrol 5920 – 6020 | 2. cella |
| `G-crow-3` | CrowHarvester | patrol 6020 – 6090 | 2. cella |
| `G-caster-1` | Gravecaller | **talajon**, patrol 6250 – 6380 | 3. cella |
| `G-P1` | platform | 5850 – 5990 | +110 |
| `G-P2` | platform | 6150 – 6290 | +110 |
| `G-P3` | platform | 6350 – 6470 | +110 |
| `G-caster-2` | Gravecaller | `G-P3`-on | +110 |

```text
                 ▄▄▄▄▄        ▄▄▄▄▄      ▄▄▄▄▄ ☠ G-caster-2
                  G-P1         G-P2       G-P3
  ═══════════════^^^^^^═══════════════^^^^^^^^═══════════
   ☠crow-1       sp-1   ☠crow-2 ☠crow-3  sp-2   ☠caster-1
   │←  1. cella  →│← 2. cella →│        │← 3. cella →│
```

**A két útvonal:**

| | földi útvonal | felső útvonal |
|---|---|---|
| ár | 3 CrowHarvester + 2 tüskemező + a 3. cellában talajszintről lövő caster | 3 ugrás +110-en, végig a `G-caster-2` bolt-sávjában |
| jutalom | a felső platformok kikerülhetők | a crow-k és a tüskék kikerülhetők |

**Követelmények**

- `G-P1 → G-P2` = 160 px, `G-P2 → G-P3` = 60 px. A 160 px **túl van** a +110-hez tartozó
  ~134 px-es korláton **azonos magasságból indulva**, de a `G-P1`-re a talajról fel lehet
  jutni, és a `G-P1 → G-P2` ugrás **azonos magasságú** (rise 0 → korlát 175) → teljesíthető.
  *A pontos értéket a unit teszt hitelesíti; ha bukik, a `G-P2` 20 px-szel balra tolandó.*
- `G-caster-2` a `G-P3`-on áll (+110), a felső útvonal platformjaival azonos magasságban →
  **ténylegesen eltalálja** az ott álló playert. A `G-P3` egyben a felső útvonal vége is:
  a lény karddal lerendezhető, ha a player odaér.
- `G-caster-1` a **talajon** áll → a 3. cellába belépő playert lövi, `DETECTION_RANGE` 400.
- A 2. cella (5896 – 6100, 204 px) **két** CrowHarvestert tart — ez a pálya legszűkebb
  harctere. Mindkettő üldözési határa a cellára korlátozva (nem lépnek tüskére).
- **A tüskemezők nem a caster bolt-sávjában vannak** — a lökés-mentes tüskepop és a
  lövedék nem kombinálódhat halálos hurokká.

---

## 14. Section H – Emelkedés (x 6400 – 6900)

**Cél:** a Level 1 zárómintája megismételve, egy szinttel több függőlegességgel.

**Elemek**

| id | típus | x | magasság |
|---|---|---|---|
| `H-crow-1` | CrowHarvester | patrol 6420 – 6560 (talaj) | – |
| `H-ladder-1` | létra | x = 6600 | talaj → `H-ledge` |
| `H-ledge` | platform | 6520 – 6760 (240 px) | +150 |
| `H-crow-2` | CrowHarvester | `H-ledge`-en, clampolt patrol 6520 – 6660 | +150 |
| `H-ladder-2` | létra | x = 6820 | `H-ledge` → boss-párkány |

**Követelmények**

- A létrán **nem lehet támadni** (dokumentált, tudatos korlát) → a `H-crow-1`-et a létra
  előtt le kell rendezni. Ez szándékos: a szakasz „kapuőr" jellegű.
- **`H-crow-2` patrol-határa legalább 80 px-re legyen a `H-ladder-1` kijáratától**, hogy a
  létráról fellépő player ne kapjon kikerülhetetlen csapást. Unit teszt őrzi.
- `H-ledge` legalább 240 px hosszú → van hely megfordulni és felvenni a harcot.

---

## 15. Section I – Boss-előtér (x 6760 – 7200)

**Elemek**

- `boss-ledge` platform: 6760 – 7200, **+300** (a pálya legmagasabb pontja, y = 118)
- **Záró checkpoint** az ajtó mellett (a Level 1 mintája: a boss-vereség ide hozza vissza
  a playert, és innen lehet **E**-vel újra belépni)
- Boss ajtó / transition trigger: x ≈ 7100

**Követelmények**

- A szakaszon **nincs enemy és nincs hazard** — a boss előtti utolsó pont mindig biztonságos.
- A párkány alatt végig van talaj (`G4` 7200-ig) → a leesés nem halál, csak visszamászás.
- Trigger: → `Boss2Scene`.
- **`Boss2Scene` még nem létezik.** A pálya végigjátszhatóságáért az ajtó átmenetileg egy
  placeholder scene-re (vagy a `NarrationScene`-re) mutasson — de a trigger neve és a
  transition kódja már a `Boss2Scene`-t célozza.

---

## 16. Checkpointok

| id | x | helye | miért ott |
|---|---:|---|---|
| `CP-1` | 2820 | `G2` vége, biztonságos talaj | a `D` szakadék **előtt** |
| `CP-2` | 4580 | `E-ledge` (a lift teteje) | az `F` kasza-szakadék **előtt**, és így nem kell újra liftezni |
| `CP-3` | 5620 | `G4` talaj | az `F` **után** — a záró aréna ne kényszerítsen kasza-ismétlésre |
| `CP-boss` | ~7080 | boss ajtó | a Level 1-es minta: boss-vereség ide hoz vissza |

**Szabály, amiből ez levezethető:** *checkpoint kerül minden olyan szakasz elé, ami
zuhanással tud ölni.* (`B` kivétel: ott a pálya eleje van 900 px-re.)

A player halálakor **az enemyk is újraélednek** — változatlan a Level 1-hez képest.

---

## 17. Enemy összesítő

| id | típus | szakasz | pozíció | szerep |
|---|---|---|---|---|
| `A-crow-1` | CrowHarvester | A | talaj | bemelegítés |
| `C-crow-1` | CrowHarvester | C | tüskesziget | landolás harcba |
| `C-crow-2` | CrowHarvester | C | talaj | checkpoint-őr |
| `D-caster-1` | **Gravecaller** | D | `D-C1` +170 | a lépcsőt lövi |
| `E-crow-1` | CrowHarvester | E | talaj | a reaper előtt |
| `E-caster-1` | **Gravecaller** | E | **talaj** | a futósávot lövi |
| `E-crow-2` | CrowHarvester | E | talaj | caster kísérője |
| `G-crow-1` | CrowHarvester | G | 1. cella | |
| `G-crow-2` | CrowHarvester | G | 2. cella | |
| `G-crow-3` | CrowHarvester | G | 2. cella | dupla nyomás |
| `G-caster-1` | **Gravecaller** | G | **talaj**, 3. cella | |
| `G-caster-2` | **Gravecaller** | G | `G-P3` +110 | a felső útvonalat lövi |
| `H-crow-1` | CrowHarvester | H | talaj, létra töve | kapuőr |
| `H-crow-2` | CrowHarvester | H | `H-ledge` +150 | kapuőr |

**Összesen: 10 CrowHarvester + 4 Gravecaller.** Új enemy típus egyelőre **nem** kell — a Beast
(11. pont, opcionális) még nincs implementálva, de később hozzáadható a pályához.

---

## 18. Hazard összesítő

| típus | db | hol |
|---|---:|---|
| Szakadék (zuhanás-halál) | 3 | `B` 800 px · `D` 800 px · `F` 960 px |
| Tüskemező | 7 | `C` ×4 · `E` ×1 · `G` ×2 |
| Swinging Reaper | 3 | `E` ×1 (talaj fölött, nem halálos) · `F` ×2 (ellenfázisban) |
| Mozgó platform | 4 | `B` ×2 vízszintes · `D` ×1 vízszintes · `E` ×1 függőleges |

---

## 19. Tervezési korlátok / invariánsok

Ezek nem stílus-kérdések, hanem **elrontható, futtathatóan ellenőrizhető állítások**:

1. **Minden felület elérhető** a start-szegmensről, az 5. pont hatótáv-képletével.
2. **Nincs kikerülhetetlen sebzés** — minden hazardnak van olvasható telegraph-ja és
   biztonságos megfigyelési pontja.
3. **Egyetlen tüskemező sem szélesebb 128 px-nél**, és minden mező mellett van ≥120 px
   biztonságos sáv.
4. **Caster bolt-sávja soha nem metszi mozgó platform pályáját.** (Mozgó platformon a
   player nem tud kitérni.)
5. **Minden caster bolt-sávja metszi legalább egy CÉL-felület álló-pozícióját.** A
   Level 1-en dokumentált hiba (a bolt 6 px-szel a fej fölött megy el) itt sem fordulhat
   elő: minden casterhez tartozik egy `CASTER_TARGETS` bejegyzés.
6. **Kasza fölött nincs visszalökés**, ha alatta szakadék van.
7. **Enemy soha nem áll mozgó platformon**, és nem tud tüskére vagy szakadékba lépni
   (üldözési határ a felület pereméből és a spike-mezőkből levezetve).
8. **Létra kijáratánál nincs enemy attack range-en belül.**
9. **A pálya legmagasabb felülete +300 px** (nincs függőleges kameragörgetés).
10. **A felső, opcionális platformsorok nem alkotnak átfutó útvonalat** (`C1–C3`).

---

## 20. Implementációs követelmények

Implementáció:

- Phaser + TypeScript, a meglévő projektarchitektúrával
- meglévő `Player`, `CrowHarvester`, `Gravecaller`, `Fireball`, combat-, checkpoint- és
  `HazardDamageGate`-rendszerek — **ezeket nem írjuk át**
- a Level 1-ben bevezetett `LevelEnemy` interfész + `type` mezős `ENEMY_SPAWNS` minta

**Új / érintett fájlok:**

| fájl | mi |
|---|---|
| `src/levels/Level2Layout.ts` | a teljes geometria adatként (a `Level1Layout.ts` mintájára): `GROUND_SEGMENTS`, `PLATFORMS`, `MOVING_PLATFORMS`, `SPIKE_FIELDS`, `REAPERS`, `LADDERS`, `ENEMY_SPAWNS`, `CHECKPOINTS` |
| `src/platforms/MovingPlatform.ts` | **új modul** — a mozgásprofil **pure függvényként** (`platformOffsetAt(elapsedMs, config)`), a Phaser-objektum ettől külön |
| `src/scenes/Level2Scene.ts` | a jelenlegi placeholder helyére |
| `tests/unit/level2Layout.test.ts` | lásd 21. pont |
| `tests/unit/movingPlatform.test.ts` | a mozgásprofil determinizmusa, szélsőértékei, várakozási ablakai |

**Arcade-specifikus tétel (fontos):** a Phaser Arcade fizika **nem viszi magával** a
kinematikus platformon álló testet. A megoldás a scene update-jében: ha a player földön van
és a `blocked.down` a mozgó platformon történik, a platform aktuális sebességét hozzá kell
adni a player pozíciójához (nem a velocityjéhez, különben az ugrás íve romlik el). Ezt
külön, kicsi és tesztelhető függvényben érdemes tartani.

**Amit ez az iteráció NEM tartalmaz:** téma/tileset, háttér, zene, hangok, feliratok,
Boss2Scene, új enemy típus, új player képesség.

---

## 21. Unit-teszt kötelezettségek (`tests/unit/level2Layout.test.ts`)

A Level 1-es minta folytatása — a spec „All platforms are reachable" pontja futtatható
állítás legyen:

1. **BFS bejárás** a start-szegmensről a `horizontalReachForRise()` képlettel → minden
   felület elérhető, beleértve a mozgó platformok **szélsőállásait** is (a mozgó platform a
   gráfban két élként jelenik meg: bal és jobb szélsőállás).
2. **`CASTER_TARGETS` tábla:** minden caster minden cél-felületére bizonyítja, hogy a bolt
   sávja metszi az ott álló player testét.
3. **Negatív állítás:** egyetlen caster bolt-sávja sem metszi egyetlen mozgó platform
   pályáját sem.
4. **Tüskemezők:** szélesség ≤ 128, a szomszédos biztonságos sáv ≥ 120.
5. **Kasza-sávok:** minden reaper szélsőállása ≥ 150 px-re a szomszédos platformok
   álló-pozíciójától; az `F` két kaszájának fáziskülönbsége pontosan félperiódus.
6. **Enemy-határok:** egyik enemy üldözési határa sem lóg tüskemezőbe, szakadék fölé, vagy
   létra-kijárat attack range-ébe.
7. **Magasság-plafon:** egyetlen felület sem magasabb +300-nál.

---

## 22. Nyitott döntések (a te döntésed kell hozzá)

1. **`CP-3` (x 5620) marad-e?** Három köztes checkpoint sok egy 7200 px-es pályán. Ha
   kimarad, a `G` arénában elhalálozó player újra átkel az `F` kasza-szakadékon
   (~15 s + kockázat). Javaslat: **maradjon benne az első kézi végigjátszásig**, aztán
   döntsünk mérés alapján.
2. **`G-caster-2` (a felső útvonal lövése) nem teszi-e értelmetlenné a felső útvonalat?**
   Ha játék közben kiderül, hogy senki nem megy fel, akkor vagy a földi útvonal ára nő
   (több crow), vagy a caster lekerül.
3. **Egyirányú platform** (a projektterv.md 13. pontjában szerepel): ha már létezik a
   kódban, a `G-P1`/`G-P2` ideális jelölt lenne rá (alulról átugorható) — jelen terv
   szándékosan **nem** épít rá.
4. **A `D` szakasz hossza:** 800 px szakadék 4 platformmal a leghosszabb folyamatos
   „nincs alattad semmi" rész. Ha túl kemény, a `D1` és `D2` közé beszúrható egy statikus
   lépcső.

---

## 23. Elfogadási kritériumok

- A player végig tud haladni STARTTÓL a `Boss2Scene` triggerig.
- Minden platform elérhető (BFS teszt zöld).
- A mozgó platformok determinisztikusan mozognak, és **viszik magukkal** a rajtuk álló
  playert; leugrás közben az ugrás íve normális.
- Mind a 7 tüskemező sebez; a `HazardDamageGate` közös i-frame ablaka működik.
- Mind a 3 kasza sebez; az `F` két kaszája ellenfázisban jár.
- Mind a 4 Gravecaller ténylegesen eltalálja a cél-felületén álló playert.
- Mindhárom köztes checkpoint aktiválódik érintésre; a boss-ajtó checkpointja `E`-vel.
- Halál → respawn a legutóbbi checkpointon, **enemy-respawnnal**.
- A kamera vízszintesen követ, függőlegesen nem görget.
- Nincs console error normál gameplay közben.
- **Tiszta játék esetén a pálya 0 sebzéssel teljesíthető** (harcot leszámítva) — minden
  hazard-találat elkerülhető.
