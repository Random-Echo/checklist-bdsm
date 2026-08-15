CHECKLISTS D/s — v133

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
- maitresse-soumis.html : Checklist Femdom — Maîtresse & Soumis.
- maitre-soumise.html : Checklist Maledom — Maître & Soumise.
- checklist.css : styles communs.
- site-bootstrap.js : langue + confirmation 18+ communes.
- checklist-engine.js : moteur fonctionnel unique.
- maitresse-soumis.js : catalogue et traductions Maîtresse & Soumis.
- maitre-soumise.js : catalogue et traductions Maître & Soumise.

Sauvegarde automatique locale
- Chaque dynamique conserve son propre espace localStorage.
- Les pratiques non renseignées ne sont pas stockées inutilement.
- Les écritures sont différées quand c’est possible puis forcées avant masquage/quittage de la page.
- Les anciennes sauvegardes JSON antérieures à v133 ne sont volontairement pas prises en charge.

Sauvegardes JSON v133 — format global version 2
Il existe exactement 3 types de fichiers, identiques depuis les deux pages :
- Complète : les deux checklists entières (réponses Homme + Femme, Fait ensemble, notes F:/H:, sécurité, séances, affichage et tirage).
- Homme : réponses de l’homme dans les deux dynamiques = Soumis + Maître, sa ligne H: des notes communes, Fait ensemble et sécurité.
- Femme : réponses de la femme dans les deux dynamiques = Maîtresse + Soumise, sa ligne F: des notes communes, Fait ensemble et sécurité.

Règles d’import Homme / Femme
- Les réponses personnelles du fichier remplacent uniquement celles de la personne concernée dans les deux checklists.
- Les réponses de l’autre personne ne sont jamais modifiées.
- Fait ensemble est additif : un Oui importé peut ajouter l’information ; une absence/Non ne supprime pas un Oui local.
- Les notes communes sont stockées en deux champs séparés. Import Homme remplace uniquement H:, import Femme uniquement F:.
- La sécurité est fusionnée prudemment : vide = pas d’effacement, protections les plus strictes conservées, hard limits/aftercare réunis, conflit de safeword/signal = valeur locale conservée.
- Les séances, leur ordre, l’affichage et le tirage ne sont pas touchés par un import Homme/Femme.

Règle d’import Complète
- Remplace entièrement les données des deux checklists par le contenu du fichier.

Notes communes
- Une seule colonne reste affichée.
- Elle contient deux lignes internes : F: puis H: (F: puis M: en anglais).
- Seule la ligne correspondant à la personne du rôle actif est modifiable ; l’autre reste visible en lecture seule.

Responsive / performances conservés
- Accueil compact sur iPhone portrait et paysage.
- En-tête iPhone compact.
- Mode paysage dédié avec colonne Catégorie retirée de la zone fixe.
- Hauteur des lignes optimisée en paysage.
- Cache DOM, stockage sparse, scroll mobile optimisé et chargement defer conservés.

- v133 : favicon bicolore ajouté à l’index, bloc Stockage retiré de l’accueil, titres rendus indépendants du nombre de pratiques et aide intégrée complétée.
