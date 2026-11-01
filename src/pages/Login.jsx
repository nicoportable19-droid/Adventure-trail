
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

  // Vérifie le retour après une connexion Google
  useEffect(() => {
    async function checkGoogleLogin() {
      try {
        await getRedirectResult(auth);
      } catch (err) {
        console.error("Erreur Google :", err);
        setError(
          "Connexion Google impossible : " +
          (err.code || err.message || "erreur inconnue")
        );
      }
    }

    checkGoogleLogin();
  }, []);

  // Connexion avec e-mail et mot de passe
  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
    } catch (err) {
      console.error("Erreur connexion :", err);

      if (err.code === "auth/invalid-credential") {
        setError("Adresse e-mail ou mot de passe incorrect.");
      } else if (err.code === "auth/user-not-found") {
        setError("Aucun compte ne correspond à cette adresse.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Trop de tentatives. Réessaie plus tard.");
      } else {
        setError(err.message || "Une erreur est survenue.");
      }

      setLoading(false);
    }
  }

  // Connexion avec Google
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
      console.error("Erreur Google :", err);
      setError(
        "Connexion Google impossible : " +
        (err.code || err.message || "erreur inconnue")
      );
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🏍️</div>

        <p style={styles.eyebrow}>ADVENTURE TRAIL</p>

        <h1 style={styles.title}>
          L'aventure<br />
          commence ici.
        </h1>

        <p style={styles.subtitle}>
          Connecte-toi pour retrouver tes road trips
          et préparer tes prochaines aventures.
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={styles.googleButton}
        >
          <span style={styles.googleIcon}>G</span>
          Continuer avec Google
        </button>

        <div style={styles.separator}>
          <span />
          <small>OU AVEC TON E-MAIL</small>
          <span />
        </div>

        <form onSubmit={handleEmailLogin}>
          <label style={styles.label}>Adresse e-mail</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemple@email.com"
            autoComplete="email"
            required
            style={styles.input}
          />

          <label style={styles.label}>Mot de passe</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ton mot de passe"
            autoComplete="current-password"
            required
            style={styles.input}
          />

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={styles.submitButton}
          >
            {loading ? "Connexion..." : "Se connecter →"}
          </button>
        </form>

        <p style={styles.registerText}>
          Pas encore de compte ?
          {" "}
          <button
            type="button"
            onClick={onGoToRegister}
            style={styles.registerButton}
          >
            Créer un compte
          </button>
        </p>

        <p style={styles.footer}>
          TRACE TA ROUTE. VIS TON AVENTURE.
        </p>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#111210",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    boxSizing: "border-box",
    color: "#f3eee2",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#191a17",
    border: "1px solid #343329",
    borderRadius: "18px",
    padding: "32px 24px",
    boxSizing: "border-box",
    textAlign: "center",
  },
  logo: {
    fontSize: "42px",
    marginBottom: "10px",
  },
  eyebrow: {
    color: "#D9B65D",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "4px",
    margin: "0 0 18px",
  },
  title: {
    fontSize: "38px",
    lineHeight: "1.08",
    margin: "0 0 14px",
    color: "#f3eee2",
  },
  subtitle: {
    color: "#aaa99f",
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 28px",
  },
  googleButton: {
    width: "100%",
    minHeight: "50px",
    borderRadius: "9px",
    border: "1px solid #555247",
    background: "#24251f",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },
  googleIcon: {
    background: "#fff",
    color: "#4285F4",
    borderRadius: "50%",
    width: "23px",
    height: "23px",
    lineHeight: "23px",
    fontWeight: "bold",
  },
  separator: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "25px 0",
    color: "#88877e",
    fontSize: "10px",
    letterSpacing: "1px",
  },
  label: {
    display: "block",
    textAlign: "left",
    color: "#d8d2c3",
    fontSize: "13px",
    margin: "16px 0 8px",
  },
  input: {
    width: "100%",
    height: "48px",
    boxSizing: "border-box",
    padding: "0 13px",
    borderRadius: "8px",
    border: "1px solid #45443a",
    background: "#111210",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
  },
  error: {
    background: "#3a211e",
    border: "1px solid #8c4940",
    color: "#ffb5a9",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "13px",
    textAlign: "left",
    marginTop: "16px",
    overflowWrap: "anywhere",
  },
  submitButton: {
    width: "100%",
    minHeight: "50px",
    marginTop: "22px",
    border: "none",
    borderRadius: "8px",
    background: "#D9B65D",
    color: "#171711",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  registerText: {
    color: "#aaa99f",
    fontSize: "13px",
    marginTop: "25px",
  },
  registerButton: {
    border: "none",
    background: "none",
    color: "#E8CC82",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13px",
  },
  footer: {
    color: "#77766c",
    fontSize: "9px",
    letterSpacing: "2px",
    marginTop: "30px",
  },
};
