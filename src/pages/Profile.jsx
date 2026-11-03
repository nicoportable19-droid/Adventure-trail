
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { auth, db } from "../firebase";

const ridingOptions = ["Trail Offroad", "Route", "Passagère"];

function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 500 / Math.max(image.width, image.height));

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile({ user = auth.currentUser, onBack }) {
  const [pseudo, setPseudo] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [riding, setRiding] = useState([]);
  const [bikes, setBikes] = useState([]);
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));

        if (!active) return;

        if (snapshot.exists()) {
          const data = snapshot.data();

          setPseudo(data.pseudo || "");
          setPhotoURL(data.photoURL || "");
          setRiding(Array.isArray(data.riding) ? data.riding : []);
          setBikes(Array.isArray(data.bikes) ? data.bikes : []);
          setCity(data.city || "");
          setRegion(data.region || "");
          setCountry(data.country || "");
        }

        setEmail(user.email || "");
      } catch (err) {
        if (active) setError("Chargement impossible : " + err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.uid]);

  function toggleRiding(option) {
    setRiding((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    );
  }

  function updateBike(index, field, value) {
    setBikes((current) =>
      current.map((bike, i) =>
        i === index ? { ...bike, [field]: value } : bike
      )
    );
  }

  function addBike() {
    setBikes((current) => [
      ...current,
      { make: "", model: "", capacity: "" },
    ]);
  }

  function removeBike(index) {
    setBikes((current) => current.filter((_, i) => i !== index));
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Choisis un fichier image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("La photo doit faire moins de 10 Mo.");
      return;
    }

    try {
      const compressed = await compressPhoto(file);

      if (compressed.length > 700000) {
        setError("Cette photo reste trop volumineuse. Choisis une autre image.");
        return;
      }

      setPhotoURL(compressed);
      setMessage("Photo prête. Enregistre ton profil pour la conserver.");
    } catch {
      setError("Impossible de lire cette photo.");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!user?.uid || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const bikesToSave = bikes.filter(
        (bike) =>
          bike.make.trim() ||
          bike.model.trim() ||
          bike.capacity.trim()
      );

      // Profil privé : informations personnelles
      const profileData = {
        pseudo: pseudo.trim(),
        photoURL,
        riding,
        bikes: bikesToSave,
        city: city.trim(),
        region: region.trim(),
        country: country.trim(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "users", user.uid),
        profileData,
        { merge: true }
      );

      // Profil public : informations visibles dans la communauté
      const publicProfileData = {
        pseudo: pseudo.trim(),
        photoURL,
        riding,
        bikes: bikesToSave,
        region: region.trim(),
        country: country.trim(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "publicProfiles", user.uid),
        publicProfileData,
        { merge: true }
      );

      // Modification de l'adresse e-mail
      if (email.trim() && email.trim() !== user.email) {
        await updateEmail(auth.currentUser, email.trim());
      }

      // Modification du mot de passe
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error(
            "Le nouveau mot de passe doit contenir au moins 6 caractères."
          );
        }

        if (
          user.providerData.some(
            (provider) => provider.providerId === "password"
          )
        ) {
          if (!currentPassword) {
            throw new Error(
              "Entre ton mot de passe actuel pour le modifier."
            );
          }

          const credential = EmailAuthProvider.credential(
            user.email,
            currentPassword
          );

          await reauthenticateWithCredential(
            auth.currentUser,
            credential
          );
        }

        await updatePassword(auth.currentUser, newPassword);
      }

      setCurrentPassword("");
      setNewPassword("");

      setMessage(
        "Profil enregistré. Tes informations publiques sont mises à jour !"
      );
    } catch (err) {
      console.error("Enregistrement du profil :", err);

      setError(
        err.message || "Impossible d'enregistrer le profil."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="trips-section">
        <p>Chargement du profil...</p>
      </main>
    );
  }

  return (
    <main className="trips-section profile-page">
      <style>{`
        .profile-page {
          --profile-sand: #D9B65D;
          --profile-light: #E8CC82;
          --profile-card: #191a17;
          --profile-border: rgba(217,182,93,.2);
        }

        .profile-page .profile-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
          margin: 28px 0;
        }

        .profile-page .profile-heading h2 {
          margin: 8px 0;
        }

        .profile-page .profile-subtitle {
          color: #aaa;
          margin: 0;
        }

        .profile-page .profile-card {
          background: var(--profile-card);
          border: 1px solid var(--profile-border);
          border-radius: 14px;
          padding: 24px;
          min-width: 0;
        }

        .profile-page .profile-card h3 {
          margin: 8px 0 20px;
        }

        .profile-page .profile-card .eyebrow {
          color: var(--profile-sand);
          letter-spacing: 1.5px;
          font-size: 11px;
          font-weight: 700;
        }

        .profile-page .profile-identity {
          display: flex;
          align-items: center;
          gap: 22px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .profile-page .profile-avatar {
          width: 112px;
          height: 112px;
          flex: 0 0 112px;
          border-radius: 50%;
          border: 2px solid var(--profile-sand);
          background: #292920;
          object-fit: cover;
        }

        .profile-page .profile-avatar-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--profile-sand);
          font-size: 42px;
        }

        .profile-page .profile-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 16px 0;
        }

        .profile-page .profile-field label {
          color: var(--profile-light);
          font-size: 13px;
          font-weight: 600;
        }

        .profile-page .profile-field input {
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .profile-page .profile-choice {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          margin: 9px 0;
          border: 1px solid #38382f;
          border-radius: 9px;
          background: #20211d;
          cursor: pointer;
        }

        .profile-page .profile-choice:has(input:checked) {
          border-color: var(--profile-sand);
          background: rgba(217,182,93,.09);
          color: var(--profile-light);
        }

        .profile-page .profile-choice input {
          accent-color: var(--profile-sand);
          width: 17px;
          height: 17px;
        }

        .profile-page .profile-bike {
          padding: 18px;
          margin: 16px 0;
          border: 1px solid #38382f;
          border-radius: 10px;
          background: #20211d;
        }

        .profile-page .profile-bike-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          color: var(--profile-light);
          font-weight: 700;
        }

        .profile-page .profile-muted {
          color: #999;
          font-size: 13px;
          line-height: 1.6;
        }

        .profile-page .profile-message {
          padding: 13px 16px;
          margin: 16px 0;
          border-radius: 9px;
          background: rgba(217,182,93,.1);
          border: 1px solid var(--profile-border);
          color: var(--profile-light);
        }

        .profile-page .profile-error {
          padding: 13px 16px;
          margin: 16px 0;
          border-radius: 9px;
          background: rgba(255,80,80,.08);
          border: 1px solid rgba(255,100,100,.3);
          color: #ff9999;
          overflow-wrap: anywhere;
        }

        .profile-page .profile-section {
          margin-top: 20px;
        }

        .profile-page .profile-save {
          margin: 26px 0 10px;
        }

        .profile-page .profile-file {
          color: #aaa;
          font-size: 13px;
          max-width: 100%;
        }

        .profile-page .profile-file::file-selector-button {
          padding: 9px 13px;
          margin-right: 10px;
          border: 1px solid var(--profile-border);
          border-radius: 7px;
          background: #292920;
          color: var(--profile-light);
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .profile-page .profile-card {
            padding: 18px;
          }

          .profile-page .profile-identity {
            gap: 15px;
          }

          .profile-page .profile-avatar {
            width: 90px;
            height: 90px;
            flex-basis: 90px;
          }
        }
      `}</style>

      <button type="button" className="text-button" onClick={onBack}>
        ← Retour
      </button>

      <div className="profile-heading">
        <div>
          <span className="eyebrow">ESPACE PERSONNEL</span>
          <h2>Mon profil</h2>
          <p className="profile-subtitle">
            Prépare ton identité de rider et personnalise ton espace.
          </p>
        </div>

        <span className="trip-status">RIDER</span>
      </div>

      {error && (
        <div className="profile-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="profile-message" role="status">
          {message}
        </div>
      )}

      <form onSubmit={saveProfile}>
        <div className="trip-grid">
          <section className="profile-card">
            <span className="eyebrow">01 — IDENTITÉ</span>
            <h3>Ma photo et mon pseudo</h3>

            <div className="profile-identity">
              {photoURL ? (
                <img
                  className="profile-avatar"
                  src={photoURL}
                  alt="Photo de profil"
                />
              ) : (
                <div className="profile-avatar profile-avatar-placeholder">
                  👤
                </div>
              )}

              <div className="profile-field" style={{ flex: 1 }}>
                <label htmlFor="profile-photo">Photo de profil</label>
                <input
                  id="profile-photo"
                  className="profile-file"
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                />
                <span className="profile-muted">
                  Image de 10 Mo maximum.
                </span>
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="profile-pseudo">Pseudo public</label>
              <input
                id="profile-pseudo"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="Ton pseudo de rider"
                maxLength={30}
              />
            </div>
          </section>

          <section className="profile-card">
            <span className="eyebrow">02 — PRATIQUE</span>
            <h3>Mon style de conduite</h3>
            <p className="profile-muted">
              Sélectionne une ou plusieurs pratiques.
            </p>

            {ridingOptions.map((option) => (
              <label className="profile-choice" key={option}>
                <input
                  type="checkbox"
                  checked={riding.includes(option)}
                  onChange={() => toggleRiding(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </section>
        </div>

        <section className="profile-card profile-section">
          <span className="eyebrow">03 — GARAGE</span>
          <h3>Mes motos</h3>
          <p className="profile-muted">
            Ajoute les motos que tu utilises pour tes aventures.
          </p>

          {bikes.length === 0 && (
            <p className="profile-muted">
              Aucune moto renseignée pour le moment.
            </p>
          )}

          {bikes.map((bike, index) => (
            <div className="profile-bike" key={index}>
              <div className="profile-bike-title">
                <span>MOTO {String(index + 1).padStart(2, "0")}</span>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => removeBike(index)}
                >
                  Supprimer
                </button>
              </div>

              <div className="trip-grid">
                <div className="profile-field">
                  <label>Marque</label>
                  <input
                    value={bike.make || ""}
                    onChange={(e) =>
                      updateBike(index, "make", e.target.value)
                    }
                    placeholder="Ex. : Yamaha"
                  />
                </div>

                <div className="profile-field">
                  <label>Modèle</label>
                  <input
                    value={bike.model || ""}
                    onChange={(e) =>
                      updateBike(index, "model", e.target.value)
                    }
                    placeholder="Ex. : Ténéré 700"
                  />
                </div>
              </div>

              <div className="profile-field">
                <label>Cylindrée (cm³)</label>
                <input
                  value={bike.capacity || ""}
                  onChange={(e) =>
                    updateBike(index, "capacity", e.target.value)
                  }
                  placeholder="Ex. : 700"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="outline-button"
            onClick={addBike}
          >
            + Ajouter une moto
          </button>
        </section>

        <section className="profile-card profile-section">
          <span className="eyebrow">04 — ORIGINES</span>
          <h3>Ma région</h3>
          <p className="profile-muted">
            Indique d'où tu pars pour tes prochaines aventures.
          </p>

          <div className="trip-grid">
            <div className="profile-field">
              <label>Ville</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ta ville"
              />
            </div>

            <div className="profile-field">
              <label>Région ou département</label>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Ta région"
              />
            </div>
          </div>

          <div className="profile-field">
            <label>Pays</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ton pays"
            />
          </div>
        </section>

        <section className="profile-card profile-section">
          <span className="eyebrow">05 — COMPTE</span>
          <h3>Mes informations de connexion</h3>

          <div className="profile-field">
            <label>Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {user.providerData.some(
            (provider) => provider.providerId === "password"
          ) && (
            <div className="profile-field">
              <label>Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          )}

          <div className="profile-field">
            <label>Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Laisser vide pour ne pas changer"
              autoComplete="new-password"
            />
          </div>

          <p className="profile-muted">
            La modification de l'e-mail ou du mot de passe peut nécessiter
            une nouvelle authentification.
          </p>
        </section>

        <button
          type="submit"
          className="primary-button full-button profile-save"
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer mon profil →"}
        </button>
      </form>
    </main>
  );
}
