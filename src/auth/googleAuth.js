import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

/**
 * Google sign-in shared by the web app and the native Capacitor app.
 * Native Google credentials are exchanged with the Firebase JS SDK so the
 * existing React app, Firestore and auth listeners keep using the same session.
 */
export async function signInWithGoogleAdventureTrail() {
  if (Capacitor.isNativePlatform()) {
    const nativeResult = await FirebaseAuthentication.signInWithGoogle();
    const idToken = nativeResult?.credential?.idToken;

    if (!idToken) {
      throw new Error("Google n'a pas fourni de jeton d'identification.");
    }

    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(auth, credential);
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return await signInWithPopup(auth, provider);
}
