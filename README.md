# Tafaß — version réellement connectée à Supabase

## 1. Créer le backend
1. Créez un projet Supabase.
2. Ouvrez SQL Editor.
3. Collez et exécutez `supabase_schema.sql`.
4. Dans Storage, vérifiez les buckets `avatars`, `media`, `files`.
5. Dans Authentication > URL Configuration, ajoutez l'URL de votre site.

## 2. Configurer le frontend
Ouvrez `config.js` et remplacez :
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

Utilisez uniquement la clé Publishable/Anon côté navigateur. Ne mettez jamais `service_role`.

## 3. Déployer
Le projet est un site statique. Vous pouvez le publier sur Vercel ou Netlify.
Il suffit de mettre les fichiers du dossier dans le dépôt.

## 4. Admin
Pour transformer un compte en admin, après inscription, exécutez dans Supabase SQL Editor :

update public.profiles
set role='admin'
where email='VOTRE_EMAIL_ADMIN';

Ne mettez pas le mot de passe admin dans le code.

## 5. Temps réel
Supabase Realtime est activé pour :
- publications
- commentaires
- likes
- messages
- notifications
- invitations d'amis
- stories

## 6. Appels audio/vidéo
L'architecture frontend est prête pour les appels, mais un appel réellement utilisable entre deux téléphones nécessite WebRTC + signalisation. Supabase Realtime peut servir de canal de signalisation. Il faut ensuite ajouter les permissions caméra/micro et les ICE candidates.

## 7. Paiement
Le système de badge est volontairement en validation manuelle :
25 000 Ar / mois.
Moyens affichés :
Yas Money +261383955105
Airtel Money +261336756185
Orange Money +261379594257
Nom : Mahandry Hery RANDRIAMALALA

Pour automatiser le paiement, il faut une API officielle du prestataire et une Edge Function sécurisée. Ne validez jamais un paiement uniquement depuis le navigateur.

## 8. Sécurité
RLS est activé dans le SQL. Vérifiez les policies avant la mise en production.
