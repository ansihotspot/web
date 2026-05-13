# Starlink Obligations Response Patcher

Deux builds dans ce repo pour le meme but: intercepter la reponse de
`/api/accounts/v1/accounts/customer-details/obligations` sur `starlink.com`
et reecrire uniquement `verificationState` et `isRestricted` sur chaque
entree de `content[]`. Tout le reste (configuration, jsonSchema, dates,
accountNumber, etc.) est conserve.

## Builds

| Build | Cible | Fichier a installer | Source |
|-------|-------|--------------------|--------|
| Chrome MV3 | Chrome / Edge / Brave (111+) | `starlink-obligations-modifier.zip` | racine du repo |
| Firefox MV2 | Firefox 115+ | `starlink-obligations-modifier-firefox.xpi` | dossier `firefox/` |

## Build Firefox (recommande sous Firefox)

Architecture MV2 avec `webRequest.filterResponseData`: l'extension
intercepte les octets de la reponse au niveau reseau, ce qui contourne
toute CSP de la page et ne necessite aucune injection de script.

Inclut un **scanner d'endpoints** (bouton dans la popup):

- **Observation passive**: toutes les requetes vers `*.starlink.com/api/*`
  sont loggees (methode + path + status + nombre de hits). Navigue sur
  le site, la liste se remplit toute seule.
- **Scan actif**: pour un (ou plusieurs) path, l'extension envoie
  GET / POST / PUT / PATCH / DELETE / HEAD / OPTIONS avec les cookies
  de session et affiche le status retourne par chaque methode. Pour
  chaque endpoint observe il y a aussi un bouton "Probe methodes" qui
  fait pareil en un clic.

### Installation temporaire

1. Telecharger `starlink-obligations-modifier-firefox.xpi`
2. Ouvrir `about:debugging#/runtime/this-firefox`
3. Cliquer sur **Charger un module complementaire temporaire...**
4. Selectionner le fichier `.xpi`

### Installation persistante

Firefox Developer Edition / Nightly / ESR uniquement: passer
`xpinstall.signatures.required` a `false` dans `about:config`, puis
glisser-deposer le `.xpi` sur la fenetre Firefox.

### Verification

Console du background script (depuis `about:debugging` > Inspecter):

```
[OblPatcher] initialized { enabled: true, ... }
[OblPatcher] background loaded, watching /api/.../obligations
[OblPatcher] intercepting https://starlink.com/api/.../obligations
[OblPatcher] patched response { verificationState: "...", isRestricted: ... }
```

Un badge "ON" puis un compteur apparait sur l'icone de l'extension a
chaque reponse patchee.

## Build Chrome

Manifest V3 avec content script en world `MAIN` qui hooke `window.fetch`
et `XMLHttpRequest`.

1. Telecharger `starlink-obligations-modifier.zip` et le decompresser
2. Ouvrir `chrome://extensions/`, activer le mode developpeur
3. **Charger l'extension non empaquetee**, selectionner le dossier

## Utilisation (les deux builds)

1. Cliquer sur l'icone de l'extension
2. Saisir la valeur de `verificationState` (par ex. `NotRequired` ou
   `Completed` pour bypasser l'ecran de verification)
3. Cocher / decocher `isRestricted`
4. Activer la modification, puis recharger l'onglet starlink.com

Defauts: `verificationState = "Required"`, `isRestricted = false`.

## Endpoint cible

`GET https://*.starlink.com/api/accounts/v1/accounts/customer-details/obligations`

## Arborescence

- `manifest.json` + `popup.{html,js}` + `content.js` + `inject.js` -
  build Chrome MV3 (racine)
- `firefox/manifest.json` + `firefox/background.js` +
  `firefox/popup.{html,js}` - build Firefox MV2
- `icons/` - icones partagees
- `starlink-obligations-modifier.zip` - artefact Chrome
- `starlink-obligations-modifier-firefox.xpi` - artefact Firefox
