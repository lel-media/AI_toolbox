# Limites du prototype

Ce document decrit ce que le prototype local de gestion de stock sait faire, ce qu'il ne sait pas faire, les hypotheses utilisees et les points a verifier avant une utilisation avec de vraies donnees.

## Ce que le prototype sait faire

- Ouvrir une application locale dans un navigateur.
- Lire un fichier Excel importe manuellement par l'utilisateur.
- Afficher les produits dans un tableau de stock.
- Filtrer les produits par recherche, categorie, statut et ecarts.
- Detecter des ruptures probables avec des regles simples.
- Identifier des stocks dormants avec des signaux simples.
- Calculer une priorite de reapprovisionnement indicative.
- Proposer une quantite conseillee indicative.
- Afficher une synthese visuelle locale.
- Supprimer les donnees de test affichees dans l'application.
- Fonctionner sans backend, sans base de donnees et sans connexion externe.

## Ce que le prototype ne sait pas faire

- Modifier le fichier Excel original.
- Sauvegarder les donnees apres fermeture ou rechargement de la page.
- Synchroniser les donnees entre plusieurs utilisateurs.
- Se connecter a un ERP, CRM, WMS, outil de commande ou outil e-mail.
- Gerer des droits utilisateurs ou des roles.
- Conserver un historique des imports ou des mouvements.
- Garantir une exactitude metier adaptee a tous les stocks.
- Lire plusieurs feuilles Excel en meme temps.
- Valider automatiquement tous les formats de colonnes possibles.
- Remplacer un outil de stock de production.

## Hypotheses utilisees

- Le fichier Excel contient une ligne d'en-tetes.
- La premiere feuille du classeur contient les donnees de stock.
- Les colonnes principales sont proches de :
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
- Les quantites de stock sont des nombres positifs ou nuls.
- Les ventes recentes permettent d'estimer une consommation moyenne.
- Le delai fournisseur est exprime en jours.
- Les priorites sont des indicateurs d'aide a la decision, pas des ordres automatiques.

## Risques avant utilisation avec de vraies donnees

- Donnees sensibles : un fichier de stock peut contenir des informations commerciales confidentielles.
- Qualite des donnees : colonnes manquantes, dates mal formatees ou nombres incoherents peuvent fausser les resultats.
- Regles trop simples : les calculs ne tiennent pas compte des saisonnalites, commandes deja passees, contraintes fournisseurs ou minimums de commande.
- Absence de sauvegarde : les donnees importees disparaissent au rechargement de la page.
- Absence de tracabilite : aucune piste d'audit n'est conservee.
- Absence de controle d'acces : toute personne ayant le fichier HTML et le fichier Excel peut ouvrir les donnees.
- Performance : un tres gros fichier Excel peut ralentir le navigateur.
- Conformite : l'utilisation de vraies donnees doit etre validee selon les regles internes de l'entreprise.

## Questions a poser a l'IT

- Les donnees de stock sont-elles considerees comme confidentielles ou sensibles ?
- Peut-on ouvrir ces donnees dans une application locale 100% navigateur ?
- Le partage d'un fichier HTML avec une librairie JavaScript locale est-il autorise ?
- La librairie SheetJS locale doit-elle etre auditee ou validee ?
- Existe-t-il une politique interne sur l'utilisation de fichiers Excel dans des outils prototypes ?
- Faut-il interdire l'import de certains fichiers ou formats ?
- Faut-il ajouter une validation antivirus ou securite sur les fichiers Excel ?
- Faut-il journaliser les imports ou les actions utilisateur ?
- Faut-il une authentification avant consultation de vraies donnees ?
- Faut-il une version hebergee, controlee et sauvegardee si le prototype devient un outil de production ?
