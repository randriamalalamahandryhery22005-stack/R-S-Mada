TAFAß V19 — UI + REALTIME CLIENT FIX

- Interface refaite en dark mobile-first selon la maquette fournie : accueil, stories, fil, menu, profil, notifications, navigation basse.
- Navigation basse : Accueil, Amis, Créer, Notifications, Profil. Messages/search/menu restent accessibles dans l'en-tête et le Menu.
- Les routes et actions existantes sont conservées.
- Ajout d’une resynchronisation client au changement de session Supabase et au démarrage.
- Les loaders/realtime Supabase existants sont réutilisés. Aucun SQL, aucune table, aucune colonne, aucune donnée existante n’a été modifiée.

Important : le Realtime Supabase dépend toujours de la publication Realtime et des policies déjà présentes dans votre projet. Ce patch ne modifie volontairement pas le schéma.
