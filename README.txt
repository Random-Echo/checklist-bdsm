CHECKLISTS D/s — V1.0

État du projet
- 3 pages : index.html, maitresse-soumis.html et maitre-soumise.html.
- 600 pratiques dans chaque checklist, avec 600 IDs uniques.
- 39 catégories, dont « Dirty talk / jeu verbal » (13 pratiques).
- Niveaux : 100 Débutant + 200 Confirmé + 300 Avancé. Dans chaque catégorie, les pratiques sont ordonnées Débutant → Confirmé → Avancé.
- Homme = bleu et toujours à gauche dans les paires de rôles.
- Femme = prune et toujours à droite.
- La couleur générale de chaque dynamique indique la personne dominante.
- Tous les fichiers sont à la racine pour GitHub Pages.

Structure
- index.html : accueil et choix de la dynamique.
- maitresse-soumis.html : Checklist Femdom — Maîtresse & Soumis.
- maitre-soumise.html : Checklist Maledom — Maître & Soumise.
- checklist.css : styles communs.
- site-bootstrap.js : langue, confirmation 18+ et état du guide de première utilisation, communs au site.
- checklist-engine.js : moteur fonctionnel unique.
- maitresse-soumis.js : catalogue et traductions Maîtresse & Soumis.
- maitre-soumise.js : catalogue et traductions Maître & Soumise.

Sauvegarde automatique locale
- Chaque dynamique conserve son propre espace localStorage.
- Les pratiques sans donnée utilisateur ne sont pas stockées inutilement.
- Les écritures sont différées quand c’est possible puis forcées avant masquage/quittage de la page.
- Les anciennes sauvegardes JSON antérieures au format global actuel ne sont volontairement pas prises en charge.

Sauvegardes JSON — format global version 2
Il existe exactement 3 types de fichiers, identiques depuis les deux pages :
- Complète : les deux checklists entières (réponses Homme + Femme, Fait ensemble, notes F:/H:, sécurité, séances, affichage et tirage).
- Homme : réponses de l’homme dans les deux dynamiques = Soumis + Maître, sa ligne H: des notes communes, Fait ensemble et sécurité.
- Femme : réponses de la femme dans les deux dynamiques = Maîtresse + Soumise, sa ligne F: des notes communes, Fait ensemble et sécurité.

Règles d’import Homme / Femme
- Les réponses personnelles du fichier remplacent uniquement celles de la personne concernée dans les deux checklists.
- Les réponses de l’autre personne ne sont jamais modifiées.
- Fait ensemble est additif : un Oui importé peut ajouter l’information ; une absence/Non ne supprime pas un Oui local.
- Import Homme remplace uniquement la ligne H: ; import Femme uniquement la ligne F:.
- La sécurité est fusionnée prudemment : vide = pas d’effacement, protections les plus strictes conservées, hard limits/aftercare réunis, conflit de safeword/signal = valeur locale conservée.
- Les séances, leur ordre, l’affichage et le tirage ne sont pas touchés par un import Homme/Femme.

Règle d’import Complète
- Remplace entièrement les données des deux checklists par le contenu du fichier.

Workflow conseillé
- À la première ouverture d’une checklist, un guide s’affiche une seule fois par appareil après la confirmation 18+.
- Pour limiter l’influence réciproque, chacun remplit idéalement ses propres rôles sur son appareil : Homme = Soumis + Maître ; Femme = Maîtresse + Soumise.
- Chacun peut écrire sa propre ligne de note commune (F: ou H:). Fait ensemble est fusionné de manière additive. Sécurité/limites/aftercare sont fusionnés prudemment.
- Après fusion, les données communes et surtout la sécurité doivent être relues ensemble avant de préparer une séance.
- Pour synchroniser ensuite les deux appareils, créer une sauvegarde Complète sur l’appareil de référence et la restaurer sur l’autre.

Responsive / performances
- Accueil et en-tête compacts sur iPhone portrait et paysage.
- Mode paysage dédié avec colonne Catégorie retirée de la zone fixe et lignes compactes.
- Cache DOM, stockage sparse, scroll mobile optimisé et chargement defer conservés.
- Le refresh ne sérialise plus les 600 pratiques pour une réécriture de stockage devenue inutile.
- Statistiques, progression « À compléter », états de catégories et éligibilité du tirage utilisent des caches invalidés uniquement lorsque les réponses concernées changent.
- Les filtres sont compilés une fois par rendu au lieu de relire les contrôles pour chaque pratique.
- Les panneaux séance, compatibilité, statistiques et filtres rapides évitent les réécritures DOM quand leur contenu n’a pas changé.
- Le tirage aléatoire retire l’ancien surlignage en O(1) au lieu de parcourir tout le catalogue.
