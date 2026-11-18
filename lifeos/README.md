# Life OS — tableau de bord personnel

Application web statique (HTML/CSS/JS, sans installation ni compte), en français, thème sombre, pensée pour téléphone et PC.

## Modules disponibles
- **Aujourd'hui** : salutation, date, météo Étrembières/Genève, agenda du jour, 3 priorités, tâches du jour (+ retards), score de la journée, semaine.
- **Rituels** : matin (agenda → retards → 3 priorités), soir (cocher → reporter → une phrase + humeur → bilan), bilan du dimanche (chiffres, réflexion, 3 focus affichés toute la semaine suivante). Journal et historique des bilans.
- **Boîte de réception** : capture en 2 s (touche `N` partout), tri vers un projet et/ou une date, ou rangement en idée.
- **Objectifs → Projets → Tâches** : 7 domaines, Kanban par projet (glisser-déposer, appui long sur téléphone), progression qui remonte automatiquement aux objectifs.
- **Plus** : liens rapides (Gmail, Drive, France Travail, Indeed + les tiens), réglages, export/import.

Prochains modules : Emploi, Admin & papiers, Budget, Habitudes & sport, Focus, Statistiques.

## Utiliser
- Ouvrir `lifeos/index.html` dans un navigateur, ou le publier avec GitHub Pages (Settings › Pages › branche, dossier racine) puis l'ajouter à l'écran d'accueil du téléphone.
- Les données sont enregistrées automatiquement dans le navigateur (localStorage). Chaque appareil a ses propres données : utilise **Plus › Exporter / Importer** pour sauvegarder ou transférer.

## Google Agenda (optionnel)
Le dashboard lit tes rendez-vous via ton propre identifiant OAuth Google (lecture seule). Les étapes sont détaillées dans **Plus › Réglages**. Il faut que le dashboard soit servi depuis une adresse web (ex. GitHub Pages), pas en `file://`. Sans connexion, tu peux ajouter tes rendez-vous à la main.

## Raccourcis
`N` capturer · `Ctrl/⌘ K` capturer · `1`–`5` onglets · `Échap` fermer
