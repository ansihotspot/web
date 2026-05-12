# Starlink Obligations Response Patcher

Extension (Manifest V3, Chrome + Firefox) qui intercepte la reponse de
l'endpoint `/api/accounts/v1/accounts/customer-details/obligations` sur
`starlink.com` et **modifie uniquement** les champs `verificationState`
et `isRestricted` sur chaque entree de `content[]`. Tous les autres
champs (configuration, jsonSchema, uiSchema, dates, etc.) restent
intacts.

## Installation Chrome / Edge / Brave

1. Telecharger `starlink-obligations-modifier.zip` et le decompresser
2. Ouvrir `chrome://extensions/`
3. Activer le **Mode developpeur** (coin superieur droit)
4. Cliquer sur **Charger l'extension non empaquetee**
5. Selectionner le dossier decompresse

## Installation Firefox (>= 128)

L'extension utilise les content scripts en world `MAIN` (specifie dans
le manifest), supporte a partir de Firefox 128 (juillet 2024).

### A. Chargement temporaire (recommande pour test)

1. Telecharger `starlink-obligations-modifier-firefox.xpi`
2. Ouvrir `about:debugging#/runtime/this-firefox`
3. Cliquer sur **Charger un module complementaire temporaire...**
4. Selectionner le fichier `.xpi`

L'extension reste active jusqu'au redemarrage de Firefox.

### B. Installation persistante (Firefox Developer Edition / Nightly / ESR)

1. Ouvrir `about:config` et passer
   `xpinstall.signatures.required` a `false`
2. Glisser-deposer le fichier `.xpi` sur la fenetre Firefox

## Verification (console)

Ouvrir DevTools sur l'onglet starlink.com (F12) puis l'onglet
**Console**. Au chargement de la page, on doit voir:

```
[ObligationsModifier:main]  interceptor installed in MAIN world for /api/.../obligations
[ObligationsModifier:content] loaded in isolated world
[ObligationsModifier:content] pushing config { enabled: ..., patch: {...} }
[ObligationsModifier:main]  config updated { enabled: ..., patch: {...} }
```

Quand la page declenche l'appel:

```
[ObligationsModifier:main] fetch detected on target https://starlink.com/api/.../obligations enabled = true
[ObligationsModifier:main] fetch patched { verificationState: ..., isRestricted: ... }
```

## Utilisation

1. Cliquer sur l'icone de l'extension
2. Saisir la valeur de `verificationState` souhaitee
3. Cocher ou decocher `isRestricted`
4. Cliquer sur **Activer la modification**
5. Recharger l'onglet Starlink

Valeurs par defaut: `verificationState = "Required"`, `isRestricted = false`.

## Fichiers

- `manifest.json` - manifest MV3 commun (avec `browser_specific_settings` pour Gecko)
- `popup.html` / `popup.js` - interface avec les champs editables
- `content.js` - injecte `inject.js` dans le world principal et relaie la config
- `inject.js` - hooke `window.fetch` et `XMLHttpRequest`, recupere la
  vraie reponse, patche `verificationState` + `isRestricted` puis la
  renvoie a l'appelant
- `icons/` - icones de l'extension

## Endpoint cible

`GET https://*.starlink.com/api/accounts/v1/accounts/customer-details/obligations`
