CHECKLISTS D/s — v130 — OPTIMISATION EXÉCUTION / RÉACTION / REFRESH


Optimisations v130 :
- catalogues et moteur chargés avec defer depuis le <head> : téléchargement lancé pendant le parsing HTML ;
- stockage local des réponses rendu sparse : seules les pratiques réellement renseignées sont sérialisées ;
- sauvegardes automatiques déplacées hors du chemin critique du clic/de la frappe via requestIdleCallback (fallback temporisé) ;
- flush garanti lors de pagehide / passage en arrière-plan ;
- index Set pour la sélection de séance au lieu de recherches Array.includes répétées ;
- réutilisation de l’index par catégorie lors des rendus, sans recréer une Map complète à chaque filtre ;
- caches DOM réutilisés pour la synchronisation des hauteurs ;
- suivi de catégorie mobile sans scan complet des lignes à chaque scroll ;
- listeners de scroll passifs ;
- suppression de rendus/calculs redondants au démarrage.

État actuel :
- 3 pages : index.html, maitresse-soumis.html et maitre-soumise.html ;
- 600 pratiques exactement dans chaque checklist ;
- 39 catégories, dont « Dirty talk / jeu verbal » (13 pratiques) ;
- niveaux : 100 Débutant + 200 Confirmé + 300 Avancé = 600 ;
- homme = bleu et toujours à gauche dans les paires de rôles ;
- femme = prune et toujours à droite ;
- la couleur générale de chaque dynamique indique la personne dominante ;
- tous les fichiers sont placés à la racine pour le déploiement GitHub Pages.

Corrections v129 :
- audit des trois pages, des deux catalogues, des traductions, des catégories, des IDs et des références locales ;
- correction du favicon de Maître & Soumise : couronne bleue au lieu de prune ;
- neuf pratiques réellement remplacées en v128 reçoivent désormais de nouveaux IDs (609 à 617), afin qu’une ancienne réponse ne puisse jamais être rattachée silencieusement à une pratique différente ;
- les pratiques seulement déplacées ou reformulées sans changement de sens conservent leur ID ;
- l’index ignore les anciens IDs retirés dans son compteur tant qu’une checklist n’a pas encore compacté son stockage local ;
- cache-busting, badges, titres et moteur passés en v129.

Structure :
- index.html : accueil et choix de la dynamique
- maitresse-soumis.html : Checklist Femdom 600 — Maîtresse & Soumis
- maitre-soumise.html : Checklist Maledom 600 — Maître & Soumise
- checklist.css : styles communs
- site-bootstrap.js : langue + confirmation 18+ communes
- checklist-engine.js : moteur fonctionnel unique
- maitresse-soumis.js : catalogue et traductions Maîtresse & Soumis
- maitre-soumise.js : catalogue et traductions Maître & Soumise

Stockages distincts :
- femdomChecklist... : Maîtresse & Soumis
- maledomChecklist... : Maître & Soumise
La langue et la confirmation 18+ sont communes au site.

Compatibilité historique :
- les anciens noms de catégories restent migrés dans la configuration lorsque nécessaire ;
- les anciens fichiers domina-soumis.html / domina-soumis.js ne font plus partie du site ;
- les anciennes réponses portant sur des IDs retirés sont ignorées plutôt que réaffectées à une nouvelle pratique.

Optimisations v127 conservées :
- catalogues allégés ;
- caches DOM pour les lignes et catégories ;
- scroll mobile incrémental ;
- écritures localStorage regroupées ;
- redimensionnement sans reconstruction complète tant que le mode responsive ne change pas.

Responsive v126 conservé :
- accueil compact sur iPhone portrait et paysage ;
- en-tête iPhone compact ;
- mode paysage dédié avec colonne Catégorie retirée de la zone fixe ;
- correction de la hauteur des lignes en paysage.
