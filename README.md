# Starlink Form Submitter

Extension Firefox (MV2) qui construit et envoie des requetes
POST/PUT/PATCH sur l'API Starlink avec les cookies de session du
navigateur. Auto-detecte le numero de compte depuis
`/api/webagg/v1/referrals/account-info/ACC-...`.

## Installation Firefox

1. Telecharger `starlink-form-submitter-firefox.xpi`
2. Ouvrir `about:debugging#/runtime/this-firefox`
3. Cliquer sur **Charger un module complementaire temporaire...**
4. Selectionner le fichier `.xpi`

L'extension reste active jusqu'au redemarrage de Firefox.

Pour une installation persistante (Developer Edition / Nightly / ESR):
passer `xpinstall.signatures.required` a `false` dans `about:config`,
puis glisser-deposer le `.xpi` sur la fenetre.

## Utilisation

Cliquer sur l'icone de l'extension - cela ouvre directement la page
formulaire dans un nouvel onglet.

1. Choisir un **template** (par defaut: `customer-details-put-kyc`)
2. Le **numero de compte** se remplit tout seul des que tu navigues
   sur `https://starlink.com/` et que la page declenche
   `/api/webagg/v1/referrals/account-info/ACC-...` (ex.
   `ACC-DF-11159739-54631-51`)
3. L'**ISO timestamp** est en mode auto par defaut (rafraichi a
   chaque seconde, et regenere a l'envoi). Decoche pour figer une
   date precise.
4. Remplir les champs (les fichiers passport/livePortrait sont
   convertis automatiquement en `data:image/jpeg;base64,...`)
5. Cliquer **Envoyer la requete** -> la reponse du serveur s'affiche

## Templates disponibles

- `POST  travel-obligations/global` - endpoint d'action, body vide
- `POST  obligations` - `{verificationState, isRestricted}`
- `PUT   customer-details (KYC)` - structure complete avec passeport
  et portrait en base64, encapsulee dans `{configurationId, requestId,
  value: JSON.stringify({...})}`
- `PUT   customer-details (simple)`
- `POST  customer-details (simple)`
- `POST  customer-details/verification`
- `[ Custom URL ]`

## Fichiers

- `firefox/manifest.json` - manifest MV2
- `firefox/background.js` - submit handler + capture du numero de
  compte depuis le webRequest
- `firefox/form.html` / `firefox/form.js` - page formulaire
- `firefox/icons/` - icones

## Endpoint de capture du compte

`GET https://*.starlink.com/api/webagg/v1/referrals/account-info/{ACC-XXX-XXXXXXXX-XXXXX-XX}`

Le segment d'URL apres `account-info/` est extrait par regex
`ACC[A-Z0-9-]+` (couvre les deux formats: `ACC-7483509-23151-13` et
`ACC-DF-11159739-54631-51`).
