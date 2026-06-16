# Reconstructions Top-15 — squelettes JSON pour test de fidélité du moteur

**Statut : SQUELETTES À VALIDER — NON RENDUS.** Généré le 2026-06-16 par Claude-Code (DG) au titre de la
mission `MISSION_2026-06-16_inventaire-assets-reels-pour-regeneration.md` (#14 du plan-maître Régénération).

## Objet
Préparer la reconstruction JSON des meilleurs réels Instagram @lecorpsnetrichejamais pour **tester la fidélité
du moteur Remotion** (`reels-engine`) en régénérant des réels « à l'identique » et en comparant au MP4 original.

## 2 gates Cyrille AVANT tout rendu (rien n'est rendu ici)
1. Lancer `deploy-pipeline-3-passes.sh` (pipeline de rendu).
2. Déposer le **vrai fond vidéo** dans `public/backgrounds/` (les squelettes utilisent le fond par défaut `noir-nuages`).

Tant que ces 2 actions ne sont pas faites, **ne pas exécuter** le rendu.

## Commande de rendu future (NE PAS exécuter maintenant)
```
node render.js reconstructions-top15/<slug>.json
# sortie : out/<slug>.mp4
```

## Provenance des données
- **Texte à l'écran** : section `## Texte à l'écran (intégral)` (OCR) du `.md` de chaque réel dans
  `/home/agents/work/corpus-reels-ig/corpus/<id>/<id>.md`.
- **reveal** : champ `reveal_detected` du même `.md`.
- **CTA** : CTA réellement affiché à l'écran (verbatim). Le mot-clé funnel (REPLAY/ALCHIMIE/GUIDE/H3C/detox5)
  vit dans la **légende**, pas à l'écran — il est noté dans le sidecar `.meta.json` (`funnel_keyword_caption`).
- **Surlignage `[[mot]]`** : appliqué sur les mots saillants (rendu jaune `#FFFF00` par le moteur). Choix
  éditorial — à ajuster par Cyrille.
- Métadonnées de provenance (id source, permalink, scores, chemins MP4 corpus + kDrive) : dans le sidecar
  `<slug>.meta.json` (le schéma `reel.schema.json` a `additionalProperties:false`, donc **aucune** méta dans
  le `.json` de rendu lui-même).

## Squelettes générés (7 fichiers, couvrant 8 des top-15)
| Fichier | Réel source | Rang | reveal | Fidélité |
|---|---|---|---|---|
| `votre-vie-amoureuse.json` | 18021933227377822 | 12 | staggered | native (= exemple du repo) |
| `femme-blessure-abandon-homme-inaccessible.json` | 17991855497610198 | 10 | all_at_once | élevée |
| `hommes-qui-fuient-les-emotions.json` | 18047197424236050 | 13 | all_at_once | élevée |
| `comportements-homme-traumas-pere.json` | 18480934747016829 | 14 | staggered | élevée |
| `ta-vie-bascule-besoin-d-etre-choisi.json` | 18158706610307848 | 15 | staggered | élevée |
| `absence-pere-blessure-fille-replay.json` | 18014274974188341 (+ 18314591737196212) | 3 (+11) | staggered | borderline (condensation) |
| `relations-pedagogiques-miroir.json` | 18009039605798732 | 4 | staggered | borderline (condensation 6 blocs, structure parallèle) |

## Localisation des assets source (vérifiée 2026-06-16)
- **Corpus local** `/home/agents/work/corpus-reels-ig/corpus/<id>/` : source autoritaire et COMPLÈTE pour les 15 réels (MP4 + `.md` OCR/caption). 273 MP4, 275 `.md`, 54 `.srt` (transcriptions audio, sous `export_v2/media/reels/YYYYMM/` — aucun des top-15 n'en a, sans impact : le texte à l'écran vient de l'OCR `.md`).
- **kDrive** `kDrive:Migration-GoogleDrive/compte-1/instagram/mes-donnees/instagram-lecorpsnetrichejamais-2025-05-29-VGOuCOWN/media/reels/YYYYMM/` : copie des MP4 (export Instagram DYI). **Snapshot daté 2025-05-29** → ne contient PAS les 3 réels publiés après (les 2025-10 : `18084879140478452`, `18009039605798732`, `18243839092294508`). Les 12 autres top-15 y sont (dual-localisés). Pas de dossier de réels typographiques « prêts » sur kDrive — uniquement les MP4 originaux bruts.
- Aucun JSON de rendu par réel n'existait nulle part avant cette mission (confirmé).

## Les 7 autres top-15 NE sont PAS reconstruits ici — et pourquoi
Réels `18084879140478452`, `18017401274379571`, `18243839092294508`,
`18031448930237883`, `18055702253082598`, `18061938323496486`, `18037133708357488`.

Ce sont des **réels de narration longue** (37 à 56 s, 30 à 50+ lignes de texte qui défile sur une vidéo
faciale/B-roll). Le moteur `reels-engine` est un moteur **typographique court** : `segments` plafonné à
**8 items** (`maxItems: 8` dans le schéma), pensé pour des accroches de 3 à 6 blocs. Une reconstruction
« à l'identique » de ces formats longs est **hors-périmètre du moteur actuel** — ce serait une réécriture
éditoriale, pas un calque. Ils sont donc **exclus du test de fidélité**. (Décision à confirmer par Cyrille :
soit on teste la fidélité uniquement sur le format typographique court — ce que fait ce dossier — soit le
moteur doit évoluer pour le format long, ce qui est un autre chantier.)

## Limites connues
- L'OCR de certains réels longs contient des fragments dupliqués/bruités (frames intermédiaires) — sans
  impact ici puisque ces réels sont exclus.
- Le découpage en segments des réels « borderline » (25.6 s) est une **condensation** éditoriale du texte
  défilant, pas un calque ligne-à-ligne.
- Tous les sidecars portent `needs_review: true`.
