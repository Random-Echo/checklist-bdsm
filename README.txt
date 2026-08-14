CHECKLISTS D/s — v127 — VERSION AUDITÉE ET OPTIMISÉE

Structure :
Tous les fichiers sont placés à la racine du site pour éviter les oublis de sous-dossiers lors du déploiement GitHub Pages.
- index.html : accueil et choix de la dynamique
- maitresse-soumis.html : Checklist Femdom 600 — Maîtresse & Soumis
- maitre-soumise.html : Checklist Maledom 600 — Maître & Soumise
- checklist.css : styles communs
- site-bootstrap.js : langue + confirmation 18+ communes
- checklist-engine.js : moteur fonctionnel unique
- maitresse-soumis.js : catalogue et traductions Maîtresse & Soumis
- maitre-soumise.js : catalogue et traductions Maître & Soumise

Il n’existe plus de fichier domina-soumis.html ni domina-soumis.js.

Stockages distincts :
- femdomChecklist... : Maîtresse & Soumis
- maledomChecklist... : Maître & Soumise
La langue et la confirmation 18+ sont communes au site.

Optimisation v127 :
- catalogues allégés : numérotation d’affichage dérivée de l’ordre et valeurs par défaut non répétées ;
- accès aux lignes et catégories du tableau mis en cache après chaque rendu complet ;
- barre de catégorie mobile mise à jour de façon incrémentale pendant le scroll ;
- champs de sécurité sauvegardés par lot au lieu d’écrire dans localStorage à chaque frappe ;
- redimensionnement sans reconstruction complète du tableau tant que le mode mobile/PC ne change pas ;
- rendu initial simplifié en supprimant un rendu d’en-tête redondant ;
- cache-busting, badges et guides passés en v127.

Audit v126 :
- alignement FR/EN de l’accueil uniformisé ;
- couleurs des cartes d’accueil calées sur les couleurs de rôle des pages : Maîtresse prune, Maître bleu ;
- renommage définitif des fichiers Domina → Maîtresse ;
- en-tête iPhone sur deux lignes : Accueil + rôles + langue / ? + masquer + lecture seule ;
- responsive PC réorganisé pour empêcher le rognage des rôles ;
- accueil mobile et paysage compactés pour tenir dans le viewport ;
- catalogue Maître & Soumise relu intégralement et différencié du catalogue Femdom ;
- correction de la hauteur excessive des lignes en iPhone paysage ;
- contrôle des catalogues, traductions, références locales et responsive.

Convention visuelle v125 : homme/bleu toujours à gauche et femme/prune toujours à droite dans les paires de rôles (cartes, sélecteur, colonnes et filtres). La couleur générale de la carte/page continue d’indiquer la dynamique dominante.
- v125 : en-tête iPhone verrouillé sur deux lignes (Accueil + rôles + langue / ? + masquer + lecture seule), avec cache-busting réellement passé à v125 ; ordre visuel explicite par variante pour garantir homme/bleu à gauche et femme/prune à droite.

- v125 : mode iPhone paysage dédié : catégorie retirée de la zone fixe, en-tête/commandes/outils/tableau fortement compactés, footer masqué pendant l'utilisation et cache-busting harmonisé en v125.

- v126 : audit intégral des trois pages ; correction des lignes de pratiques surdimensionnées en iPhone paysage (flex-basis), index paysage compacté pour tenir sans scroll, harmonisation des titres et rôles FR/EN, contrôle des catalogues, traductions, références locales et responsive.
