import { defineConfig } from 'vite';

// A projekt eddig teljesen Vite-defaultokon futott; ez az ELSO konfiguracios fajl, es
// SZANDEKOSAN egyetlen beallitast tartalmaz. Minden mas (dev szerver, outDir, plugin-lista,
// asset-kezeles) marad a default, mert a build eddig is helyesen mukodott.
export default defineConfig({
  // A `base` defaultja `'/'`, ami ROOT-ABSZOLUT utvonalakat general: a `dist/index.html`
  // `/assets/index-*.js`-t tolt, a bundle-ben pedig ~69 db `/assets/*.png|mp3` hivatkozas all.
  // Ez CSAK akkor jo, ha a jatek a domain GYOKERERE kerul ki.
  //
  // Az itch.io HTML5 buildet viszont NEM a gyokerbol szolgalja ki, hanem egy generalt
  // alutvonalrol (`html-classic.itch.zone/html/<id>/index.html`), tehat ott minden
  // `/assets/...` keres a domain gyokerere menne -> mind 404, es a jatek EL SEM INDULNA.
  // Ugyanez all egy GitHub Pages project-page deployra is (`/<repo-nev>/` alutvonal),
  // amit a Project_plan.md 31. pontja kesobbi merfoldkokent tervez.
  //
  // A `'./'` mindket esetet lefedi, es a gyokerbol kiszolgalast sem rontja el: az
  // `index.html` mindig a deploy-mappa gyokereben all, tehat a hozza kepest relativ
  // utvonal minden elhelyezesnel helyes. Ezert nincs kornyezetfuggo elagazas.
  //
  // FIGYELEM: ha ez valaha visszaall `'/'`-re, az itch.io build NEMAN romlik el —
  // a `npm run build` zold marad, a hiba csak a feltoltott jatekban jon elo.
  base: './',
});
