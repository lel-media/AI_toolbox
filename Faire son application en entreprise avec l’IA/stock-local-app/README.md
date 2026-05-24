# Les électrons libres - Gestion de stock locale

Prototype local de gestion de stock à partir d'un fichier Excel.

## Lancer l'application

Depuis ce dossier :

```bash
python3 -m pip install -r requirements.txt
python3 app.py
```

Puis ouvrir :

```text
http://127.0.0.1:8000
```

Importer ensuite le fichier Excel `stock_fictif_codex.xlsx` depuis l'interface.

## Format Excel attendu

Le prototype attend un onglet avec ces colonnes :

| Colonne | Exemple | Rôle |
|---|---|---|
| `produit` | `Câble USB-C 1m` | Nom affiché dans le tableau |
| `categorie` | `Accessoire` | Filtre et regroupement |
| `stock_actuel` | `12` | Niveau de stock |
| `stock_minimum` | `20` | Seuil minimum |
| `ventes_7_jours` | `18` | Vitesse de consommation récente |
| `delai_reappro_jours` | `5` | Délai fournisseur |
| `fournisseur` | `Fournisseur A` | Information produit |
| `dernier_reappro` | `2026-05-10` | Information affichable |
| `commentaire` | `ventes rapides` | Signal métier complémentaire |

Comme le fichier fourni ne contient pas de référence produit, l'application génère des références locales du type `STK-0001`. Le fichier Excel original n'est jamais modifié.

## Règles métier

- Rupture probable : stock sous le minimum ou couverture inférieure au délai de réapprovisionnement.
- Couverture : `stock_actuel / (ventes_7_jours / 7)`.
- Stock dormant probable : stock au-dessus du minimum avec ventes très faibles, ou commentaire contenant `dormant`.
- Priorité de réapprovisionnement : score de 0 à 100 basé sur le stock sous seuil, la couverture, les ventes récentes et le délai fournisseur.
- Quantité conseillée : estimation locale visant à couvrir le minimum et une courte période de sécurité.

## Limites du prototype

- Les données restent locales et en mémoire pendant la session.
- Aucun email n'est envoyé.
- Aucune connexion ERP, CRM ou outil externe n'est utilisée.
- Le prototype ne modifie pas le fichier Excel original.
- La valeur financière du stock n'est pas calculée, car le fichier fourni ne contient pas de prix unitaire.
- Les stocks dormants sont estimés avec les données disponibles ; une vraie date de dernière vente améliorerait la précision.
