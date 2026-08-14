CHECKLISTS D/s — v131 — BASE NETTOYÉE

État du projet
- 3 pages : index.html, maitresse-soumis.html et maitre-soumise.html.
- 600 pratiques exactement dans chaque checklist.
- 39 catégories, dont « Dirty talk / jeu verbal » (13 pratiques).
- Niveaux : 100 Débutant + 200 Confirmé + 300 Avancé = 600.
- Homme = bleu et toujours à gauche dans les paires de rôles.
- Femme = prune et toujours à droite.
- La couleur générale de chaque dynamique indique la personne dominante.
- Tous les fichiers sont à la racine pour GitHub Pages.

Structure
- index.html : accueil et choix de la dynamique.
- maitresse-soumis.html : Checklist Femdom 600 — Maîtresse & Soumis.
- maitre-soumise.html : Checklist Maledom 600 — Maître & Soumise.
- checklist.css : styles communs.
- site-bootstrap.js : langue + confirmation 18+ communes.
- checklist-engine.js : moteur fonctionnel unique.
- maitresse-soumis.js : catalogue et traductions Maîtresse & Soumis.
- maitre-soumise.js : catalogue et traductions Maître & Soumise.

Nettoyage v131
- Suppression des migrations d’anciens scores, champs, IDs, catégories, colonnes et réglages aléatoires.
- Suppression des anciennes clés Femdom communes au site.
- Suppression de la compatibilité avec les sauvegardes non typées et les anciens formats de sauvegarde.
- Suppression de la liste temporaire des IDs retirés utilisée par l’index.
- Sauvegardes JSON reparties sur un schéma propre version 1.
- Suppression des traductions devenues orphelines.
- CSS consolidé : déclarations identiques écrasées plus loin supprimées et commentaires historiques retirés.
- Conservation des optimisations de réaction, stockage sparse, cache DOM, scroll mobile et chargement defer.

Sauvegardes
- Une sauvegarde créée avant la v131 n’est volontairement plus prise en charge.
- Les nouvelles sauvegardes v131 portent version: 1 et l’identifiant de leur checklist.
- Les stockages locaux Maîtresse & Soumis et Maître & Soumise restent séparés.

Responsive conservé
- Accueil compact sur iPhone portrait et paysage.
- En-tête iPhone compact.
- Mode paysage dédié avec colonne Catégorie retirée de la zone fixe.
- Hauteur des lignes optimisée en paysage.
