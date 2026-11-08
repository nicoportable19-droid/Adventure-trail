
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import { signInWithGoogleAdventureTrail } from "../auth/googleAuth";

export default function Register({ onGoToLogin }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(result.user, {
        displayName: firstName.trim(),
      });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Cette adresse e-mail possède déjà un compte.");
      } else if (err.code === "auth/invalid-email") {
        setError("L'adresse e-mail n'est pas valide.");
      } else if (err.code === "auth/weak-password") {
        setError("Choisis un mot de passe plus sécurisé.");
      } else {
        setError("Impossible de créer le compte. Réessaie.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogleAdventureTrail();
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("L'inscription avec Google a échoué.");
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

        <p className="auth-eyebrow">PRÉPARE TA PROCHAINE AVENTURE</p>
        <h1>Créer un compte</h1>
        <p className="auth-description">
          Rejoins ton équipe et organise tes voyages à moto.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <label htmlFor="register-name">Ton prénom</label>
          <input
            id="register-name"
            type="text"
            placeholder="Ton prénom"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            required
          />

          <label htmlFor="register-email">Adresse e-mail</label>
          <input
            id="register-email"
            type="email"
            placeholder="exemple@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="register-password">Mot de passe</label>
          <input
            id="register-password"
            type="password"
            placeholder="6 caractères minimum"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />

          <label htmlFor="register-confirm-password">
            Confirmer le mot de passe
          </label>
          <input
            id="register-confirm-password"
            type="password"
            placeholder="Répète ton mot de passe"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />

          <button
            className="auth-primary-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Création du compte..." : "Créer mon compte"}
          </button>
        </form>

        <div className="auth-separator">
          <span>OU</span>
        </div>

        <button
          className="auth-google-button"
          type="button"
          onClick={handleGoogleRegister}
          disabled={loading}
        >
          <span className="google-g">G</span>
          Continuer avec Google
        </button>

        <p className="auth-switch">
          Tu as déjà un compte ?
          <button type="button" onClick={onGoToLogin}>
            Se connecter
          </button>
        </p>
      </section>
    </main>
  );
}
