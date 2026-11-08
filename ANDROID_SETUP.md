# Préparation Android — Adventure Trail

Cette branche conserve l'authentification e-mail/mot de passe Firebase JS et ajoute une connexion Google native Capacitor, puis échange le jeton Google dans Firebase JS (`signInWithCredential`) afin que Firestore et les listeners React voient la session.

## Avant de générer Android

1. Vérifier que le projet Firebase `adventure-trail-2727d` a **Google** activé dans Authentication > Sign-in method.
2. Installer les dépendances depuis la racine du projet :
   ```bash
   npm install
   npm run build
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
   Si `android/` existe déjà, ne lance pas `cap add android`; lance `npx cap sync android`.
3. Dans Firebase Console > Project settings > Your apps, enregistrer l'empreinte SHA-1 et SHA-256 du certificat debug de l'application Android. Le package Android défini ici est `com.adventuretrail.app`; si tu as déjà un identifiant Android officiel, remplace `appId` dans `capacitor.config.ts` avant `cap add android`.
4. Télécharger le `google-services.json` Android mis à jour depuis Firebase et le placer dans `android/app/` (ne pas le publier dans un dépôt public).
5. Dans Android Studio, générer l'APK debug via Build > Build APK(s), puis tester Google et e-mail/mot de passe.

## Notes

- La connexion Google Web garde son flux popup; l'application native utilise le plugin Capacitor.
- `skipNativeAuth: true` est volontaire : la connexion native fournit le jeton, puis Firebase JS connecte la couche web pour conserver l'accès à Firestore.
- Le package `com.adventuretrail.app` est une valeur provisoire à confirmer avant création Android.
- La version Capacitor 8 nécessite un environnement Android compatible Capacitor 8. Vérifier les versions Java/Gradle/Android Studio lors de la génération.
