// Rend une miniature YouTube 1280×720 : image générée en fond, lettrage H3C par-dessus.
//
//   node render-miniature.mjs <image.png> "<TITRE>" <sortie.jpg> ["MOT FORT|AUTRE MOT"]
//
// Le lettrage n'est PAS généré avec l'image. Un modèle d'image rend « une grasse
// condensée », jamais Anton, et il le place où il veut : sur 59 vignettes, cela ne fait
// pas une chaîne, cela fait 59 affiches sans rapport. Ici la police, la place, la barre
// et la signature sont fixes — c'est ce qui se reconnaît d'une vignette à l'autre.
//
// Polices embarquées (woff2 dans ../fonts) : aucune dépendance réseau, aucun risque de
// substitution silencieuse par une police système au moment du rendu.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const [image, titre, sortie, accent] = process.argv.slice(2);

if (!image || !titre || !sortie) {
  console.error('usage: render-miniature.mjs <image> "<TITRE>" <sortie.jpg> ["MOT|MOT"]');
  process.exit(2);
}
const imageAbs = resolve(image);
if (!existsSync(imageAbs)) { console.error('image introuvable :', imageAbs); process.exit(2); }

const echapper = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Les mots forts sont surlignés en jaune DANS le titre — plusieurs segments possibles,
// séparés par « | ». C'est le geste que Cyrille fait à la main sur Instagram : l'œil
// attrape deux mots, pas une phrase.
//
// L'accent portait auparavant sur une PHRASE entière, et seulement si elle correspondait
// exactement. Sur « IL COPIE VOTRE DOUTE », qui est d'un bloc, il n'y avait donc rien à
// accentuer : la vignette sortait uniformément blanche sans que rien ne le signale.
//
// Un segment qui ne figure pas dans le titre est IGNORÉ, et on le dit sur la sortie
// d'erreur : une faute de frappe dans un mot fort produirait sinon une vignette unie,
// exactement comme si l'accent n'avait jamais été demandé.
const segments = (accent || '').split('|').map((s) => s.trim()).filter(Boolean);

// On échappe AVANT de poser les balises, et on cherche le segment échappé dans le titre
// échappé : chercher dans le texte brut puis échapper détruirait les balises posées, et
// une apostrophe typographique suffirait à tout décaler.
// Bornes de mot, et non simple sous-chaîne : « PAS » ne doit pas allumer la moitié de
// « PASSER ». `\b` de JavaScript ne connaît pas les accents — il verrait une frontière au
// milieu de « ÉNERGIE » — d'où la classe explicite. L'apostrophe n'en fait pas partie,
// et c'est voulu : dans « L'AMOUR », le mot fort est « AMOUR ».
const LETTRE = "A-Za-zÀ-ÖØ-öø-ÿ0-9";
const echapperRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const surligner = (ligne) => {
  // Un nombre reste collé au mot qui le suit : « ÇA 8 / FOIS » laissait le chiffre
  // orphelin en fin de ligne (2026-08-18). L'espace insécable force « 8 FOIS » ensemble.
  let html = echapper(ligne).replace(/(\d+)\s+(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1\u00A0');
  for (const segment of segments) {
    const cible = echapper(segment);
    const motif = new RegExp(`(?<![${LETTRE}])${echapperRegex(cible)}(?![${LETTRE}])`, 'g');
    if (!motif.test(html)) continue;
    motif.lastIndex = 0;
    html = html.replace(motif, `<span class="accent">${cible}</span>`);
  }
  return html;
};

for (const segment of segments) {
  if (!echapper(titre).includes(echapper(segment))) {
    console.error(`mot fort absent du titre, ignoré : « ${segment} »`);
  }
}

// Une ligne par phrase. Le point est la seule coupe qui ait du sens dans un titre de
// miniature : « 17 QUESTIONS. » puis « 9 MINUTES. », jamais un chiffre orphelin en fin
// de ligne. Sans phrase, on garde le titre d'un bloc.
const lignes = titre.split(/(?<=[.?!])\s+/).map((l) => l.trim()).filter(Boolean);
const titreHtml = (lignes.length ? lignes : [titre])
  .map((ligne) => `<span class="ligne">${surligner(ligne)}</span>`).join('');

// `replaceAll` et non `replace` : les marqueurs sont documentés dans le commentaire en
// tête du gabarit, et `replace` ne remplaçait que cette PREMIÈRE occurrence — la page
// gardait `__IMAGE__` et `__TITRE__` en clair. Le rendu sortait avec une image cassée et
// le mot « TITRE » en gros, sans la moindre erreur.
const gabarit = readFileSync(resolve(__dirname, 'miniature-youtube.html'), 'utf-8')
  .replaceAll('__IMAGE__', pathToFileURL(imageAbs).href)
  .replaceAll('__TITRE__', titreHtml);

const tmp = resolve(__dirname, `.miniature-${process.pid}.html`);
writeFileSync(tmp, gabarit, 'utf-8');

const navigateur = await chromium.launch();
try {
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 720 },
                                          deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
  // Les woff2 se chargent après `networkidle` dans certains cas : attendre explicitement
  // que la police soit prête, sinon le rendu part en police de repli sans une erreur.
  await page.evaluate(() => document.fonts.ready);
  // Ajustement automatique : une ligne ne se coupe plus (elle suit le sens), donc un
  // titre long déborderait sur le visage. On réduit le corps jusqu'à ce que la plus
  // large tienne dans le bloc — plutôt que de fixer une longueur maximale au brief,
  // qui contraindrait l'écriture pour une raison purement typographique.
  await page.evaluate(() => {
    const bloc = document.querySelector('.titre');
    const cadre = document.querySelector('.bloc');
    // On part TRÈS grand et on ne réduit qu'au strict nécessaire. La contrainte n'est
    // plus la largeur d'une ligne — une phrase peut se replier — mais la HAUTEUR de
    // l'ensemble : le pavé ne doit ni sortir de l'image ni recouvrir le visage.
    const hauteurMax = 540;   // sur 720, laisse la barre et la signature respirer
    let corps = 172;
    const deborde = () => bloc.scrollHeight > hauteurMax
      || Array.from(bloc.querySelectorAll('.ligne')).some((l) => l.scrollWidth > cadre.clientWidth);
    while (deborde() && corps > 104) { corps -= 4; bloc.style.fontSize = corps + 'px'; }
  });
  await page.screenshot({ path: resolve(sortie), type: 'jpeg', quality: 92 });
  console.log('miniature →', resolve(sortie));
} finally {
  await navigateur.close();
  try { (await import('node:fs')).unlinkSync(tmp); } catch {}
}
