# Starlink Obligations Response Patcher

Extension Chrome (Manifest V3) qui intercepte la reponse de l'endpoint
`/api/accounts/v1/accounts/customer-details/obligations` sur `starlink.com`
et **modifie uniquement** les champs `verificationState` et `isRestricted`
sur chaque entree de `content[]`. Tous les autres champs (configuration,
jsonSchema, uiSchema, dates, etc.) sont laisses intacts.

## Installation

1. Ouvrir `chrome://extensions/`
2. Activer le **Mode developpeur** (coin superieur droit)
3. Cliquer sur **Charger l'extension non empaquetee**
4. Selectionner le dossier de ce projet

## Utilisation

1. Cliquer sur l'icone de l'extension pour ouvrir la popup
2. Saisir la valeur de `verificationState` souhaitee (texte libre)
3. Cocher ou decocher `isRestricted`
4. Cliquer sur **Activer la modification**
5. Recharger l'onglet Starlink: la vraie reponse du serveur est recue
   puis ces deux champs sont reecrits a la volee

Valeurs par defaut: `verificationState = "Required"`, `isRestricted = false`.

## Fichiers

- `manifest.json` - manifest MV3
- `popup.html` / `popup.js` - interface avec les champs editables
- `content.js` - injecte `inject.js` et relaie la config via `CustomEvent`
- `inject.js` - hooke `window.fetch` et `XMLHttpRequest`, recupere la
  vraie reponse, patche `verificationState` + `isRestricted` puis la
  renvoie a l'appelant
- `icons/` - icones de l'extension

## Endpoint cible

`GET https://*.starlink.com/api/accounts/v1/accounts/customer-details/obligations`
