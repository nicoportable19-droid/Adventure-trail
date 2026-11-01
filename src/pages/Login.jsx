
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

export default function Login({ onGoToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      if (err.code === "auth/invalid-credential") {
        setError("Adresse e-mail ou mot de passe incorrect.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Trop de tentatives. Réessaie plus tard.");
      } else {
        setError("Impossible de se connecter. Vérifie tes informations.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
  console.error("Erreur Google :", error);
  setError(
    "Erreur Google : " + error.code + " — " + error.message
  );
}
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">AT</span>
          <span>ADVENTURE TRAIL</span>
        </div>

        <p className="auth-eyebrow">BIENVENUE SUR LA ROUTE</p>
        <h1>Connexion</h1>
        <p className="auth-description">
          Retrouve tes aventures et ton équipe.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin}>
          <label htmlFor="login-email">Adresse e-mail</label>
          <input
            id="login-email"
            type="email"
            placeholder="exemple@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            type="password"
            placeholder="Ton mot de passe"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="auth-separator">
          <span>OU</span>
        </div>

        <button
          className="auth-google-button"
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span className="google-g">G</span>
          Continuer avec Google
        </button>

        <p className="auth-switch">
          Pas encore de compte ?
          <button type="button" onClick={onGoToRegister}>
            Créer un compte
          </button>
        </p>
      </section>
    </main>
  );
}
