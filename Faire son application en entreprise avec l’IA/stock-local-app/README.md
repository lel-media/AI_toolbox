# Les electrons libres - Prototype stock local

Prototype local de gestion de stock a partir d'un fichier Excel.

## Lancer l'application

Ouvrez simplement `index.html` dans un navigateur moderne.

Aucun serveur local n'est obligatoire. Aucun backend, aucune base de donnees et aucune connexion externe ne sont utilises par l'application.

Commande macOS optionnelle depuis ce dossier :

```bash
open index.html
```

## Importer un fichier Excel

1. Ouvrez `index.html`.
2. Cliquez sur `Importer Excel`.
3. Selectionnez un fichier `.xlsx` ou `.xls`.

Le fichier Excel original reste intact. L'application lit une copie temporaire en memoire dans le navigateur.

## Gestion des donnees chargees

La page `Tableau de stock` affiche :

- le nom de la source chargee ;
- le nombre de lignes ;
- l'emplacement des donnees.

Les donnees sont uniquement en memoire dans le navigateur. Elles ne sont pas stockees dans un fichier, ni dans une base locale.

Le bouton `Supprimer les donnees de test` retire les donnees d'exemple de l'application. Il ne supprime jamais le fichier Excel original.

## Colonnes reconnues

Le prototype reconnait notamment :

- `produit`
- `categorie`
- `stock_actuel`
- `stock_minimum`
- `ventes_7_jours`
- `ventes_30j`
- `delai_reappro_jours`
- `fournisseur`
- `reference`
- `commentaire`

Si aucune reference n'est fournie, l'application genere un identifiant d'affichage temporaire.

## Librairie locale

La lecture Excel est faite avec SheetJS, fichier local :

`libs/xlsx.full.min.js`

Elle sert uniquement a lire le fichier Excel dans le navigateur et a transformer la premiere feuille en donnees exploitables.

## Limites du prototype

- Les donnees ne sont pas sauvegardees apres fermeture de l'onglet.
- Le prototype lit la premiere feuille du classeur.
- Les regles de priorite sont volontairement simples.
- Les graphiques sont des visualisations HTML/CSS, pas des exports Excel.
- Aucune connexion ERP, CRM, e-mail ou outil externe n'est effectuee.
