CHECKLISTS D/s — v123 — VERSION AUDITÉE

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

Audit v123 :
- alignement FR/EN de l’accueil uniformisé (titres et paragraphes gardent leur affichage naturel) ;
- couleurs des cartes d’accueil calées sur les couleurs de rôle des pages : Maîtresse prune, Maître bleu ;
- renommage définitif des fichiers Domina → Maîtresse : maitresse-soumis.html et maitresse-soumis.js ;
- ancienne page domina-soumis.html supprimée, sans redirection ;
- identifiant de variante Maîtresse & Soumis harmonisé en maitresse-soumis ;
- en-tête iPhone forcé sur exactement deux lignes :
  1. Accueil + sélection de rôle + FR/EN ;
  2. ? + Masquer/Afficher l’autre rôle + Lecture seule ;
- largeur du sélecteur de rôle recalculée sur iPhone, tablette et PC afin que Maître/Maîtresse/Soumis/Soumise ne soient jamais rognés ;
- responsive PC réorganisé par plages de largeur au lieu de comprimer les boutons ;
- accueil mobile converti en mise en page plein viewport : les deux cartes, le titre, le sous-titre, l’avertissement de stockage et le pied de page tiennent sans scroll ;
- mode encore plus compact activé automatiquement sur les petits écrans de faible hauteur ;
- moteur, badges, guides et cache-busting harmonisés en v123 ;
- catalogues, risques, IDs, niveaux, réponses et logique fonctionnelle conservés.

Convention visuelle v123 : homme/bleu toujours à gauche et femme/prune toujours à droite dans les paires de rôles (cartes, sélecteur, colonnes et filtres). La couleur générale de la carte/page continue d’indiquer la dynamique dominante.
- v123 : en-tête iPhone verrouillé sur deux lignes (Accueil + rôles + langue / ? + masquer + lecture seule), avec cache-busting réellement passé à v123 ; ordre visuel explicite par variante pour garantir homme/bleu à gauche et femme/prune à droite.
