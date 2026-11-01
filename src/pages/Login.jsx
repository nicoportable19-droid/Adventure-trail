
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

import { auth } from "../firebase";

export default function Login({ onGoToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkGoogleLogin() {
      try {
        const result = await getRedirectResult(auth);

        if (result) {
          console.log("Compte Google authentifié :", result.user.email);
        }
      } catch (err) {
        console.error("Erreur retour Google :", err);
        setError(
          "Connexion Google impossible : " +
            (err.code || "erreur inconnue") +
            " — " +
            (err.message || "")
        );
      }
    }

    checkGoogleLogin();
  }, []);

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Erreur connexion email :", err);
      setError(err.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      await signInWithRedirect(auth, provider);
    } catch (err) {
      console.error("Erreur connexion Google :", err);
      setError(
        "Connexion Google impossible : " +
          (err.code || "erreur inconnue") +
          " — " +
          (err.message || "")
      );
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🏍️</div>

        <div className="auth-brand">ADVENTURE TRAIL</div>

        <p className="auth-subtitle">
          RIDE · EXPLORE · SHARE
        </p>

        <h1>Bon retour, rider.</h1>

        <p className="auth-description">
          Connecte-toi pour retrouver tes aventures.
        </p>

        <form onSubmit={handleEmailLogin}>
          <label>Adresse e-mail</label>
          <input
            type="email"
            placeholder="ton@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Mot de passe</label>
          <input
            type="password"
            placeholder="Ton mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Connexion..." : "SE CONNECTER"}
          </button>
        </form>

        <div className="auth-separator">
          <span>OU</span>
        </div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? "REDIRECTION..." : "Continuer avec Google"}
        </button>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <p className="auth-switch">
          Pas encore de compte ?
          <button
            type="button"
            onClick={onGoToRegister}
          >
            Créer un compte
          </button>
        </p>
      </div>
    </main>
  );
}
