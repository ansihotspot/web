# Starlink Obligations Response Modifier

Extension Chrome (Manifest V3) qui intercepte la reponse de l'endpoint
`/api/accounts/v1/accounts/customer-details/obligations` sur `starlink.com`
et la remplace par un JSON arbitraire quand on active le bouton dans la popup.

## Installation

1. Ouvrir `chrome://extensions/`
2. Activer le **Mode developpeur** (coin superieur droit)
3. Cliquer sur **Charger l'extension non empaquetee**
4. Selectionner le dossier de ce projet

## Utilisation

1. Cliquer sur l'icone de l'extension pour ouvrir la popup
2. (Optionnel) Modifier le JSON injecte dans la zone de texte
3. Cliquer sur **Activer la modification**
4. Recharger l'onglet Starlink: la reponse de l'endpoint cible sera
   remplacee par le payload configure

Par defaut, le payload remplace `content` par un tableau vide, ce qui
revient a indiquer qu'il n'y a aucune obligation a remplir.

## Fichiers

- `manifest.json` - manifest MV3
- `popup.html` / `popup.js` - interface de la popup avec le bouton on/off
- `content.js` - content script qui injecte `inject.js` dans la page
  et lui transmet l'etat via `CustomEvent`
- `inject.js` - hooks `window.fetch` et `XMLHttpRequest`, et reecrit la
  reponse quand l'URL correspond a l'endpoint cible
- `icons/` - icones de l'extension

## Endpoint cible

`GET https://*.starlink.com/api/accounts/v1/accounts/customer-details/obligations`
