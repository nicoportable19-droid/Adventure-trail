import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { auth, db, storage } from "../firebase";

const ridingStyles = [
  "Trail Offroad",
  "Route",
  "Passagère",
];

const emptyBike = {
  brand: "",
  model: "",
  capacity: "",
};

export default function Profile({ user, onBack }) {
  const [pseudo, setPseudo] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [riding, setRiding] = useState([]);
  const [bikes, setBikes] = useState([{ ...emptyBike }]);
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");

  const [photoFile, setPhotoFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const hasPasswordLogin = user?.providerData?.some(
    (provider) => provider.providerId === "password"
  );

  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid) return;

      try {
        const profileRef = doc(db, "users", user.uid);
        const profileSnapshot = await getDoc(profileRef);

        if (profileSnapshot.exists()) {
          const data = profileSnapshot.data();

          setPseudo(data.pseudo || "");
          setPhotoURL(data.photoURL || "");
          setRiding(data.riding || []);
          setBikes(
            data.bikes?.length ? data.bikes : [{ ...emptyBike }]
          );
          setCity(data.city || "");
          setRegion(data.region || "");
          setCountry(data.country || "");
        } else {
          setPseudo(user.displayName || "");
        }
      } catch (err) {
        setError("Impossible de charger ton profil.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  function toggleRidingStyle(style) {
    setRiding((current) =>
      current.includes(style)
        ? current.filter((item) => item !== style)
        : [...current, style]
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
    setBikes((current) => [...current, { ...emptyBike }]);
  }

  function removeBike(index) {
    setBikes((current) =>
      current.length === 1
        ? [{ ...emptyBike }]
        : current.filter((_, i) => i !== index)
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!pseudo.trim()) {
      setError("Choisis un pseudo public.");
      return;
    }

    setSaving(true);

    try {
      let updatedPhotoURL = photoURL;

      if (photoFile) {
        const photoRef = ref(
          storage,
          `profilePhotos/${user.uid}/${Date.now()}_${photoFile.name}`
        );

        await uploadBytes(photoRef, photoFile);
        updatedPhotoURL = await getDownloadURL(photoRef);
      }

      const profileData = {
        pseudo: pseudo.trim(),
        photoURL: updatedPhotoURL,
        riding,
        bikes: bikes.filter(
          (bike) =>
            bike.brand.trim() ||
            bike.model.trim() ||
            bike.capacity.trim()
        ),
        city: city.trim(),
        region: region.trim(),
        country: country.trim(),
        email: user.email || "",
        updatedAt: serverTimestamp(),
      };

      await setDoc(
        doc(db, "users", user.uid),
        profileData,
        { merge: true }
      );

      setPhotoURL(updatedPhotoURL);
      setPhotoFile(null);
      setMessage("Profil enregistré avec succès !");
    } catch (err) {
      console.error(err);
      setError(
        "Enregistrement impossible. Vérifie les règles Firebase."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!currentPassword || newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setMessage("Mot de passe modifié !");
    } catch (err) {
      if (err.code === "auth/wrong-password" ||
          err.code === "auth/invalid-credential") {
        setError("Ton mot de passe actuel est incorrect.");
      } else {
        setError("Impossible de modifier le mot de passe.");
      }
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px",
    marginTop: "7px",
    marginBottom: "15px",
    borderRadius: "9px",
    border: "1px solid rgba(217,182,93,0.3)",
    background: "#111210",
    color: "#fff",
    fontSize: "15px",
  };

  const labelStyle = {
    display: "block",
    color: "#D9B65D",
    fontWeight: "600",
    marginTop: "10px",
  };

  const cardStyle = {
    background: "#191a17",
    border: "1px solid rgba(217,182,93,0.2)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "20px",
  };

  if (loading) {
    return (
      <section className="trips-section">
        <p>Chargement de ton profil...</p>
      </section>
    );
  }

  return (
    <section className="trips-section">
      <button className="text-button" onClick={onBack}>
        ← Retour
      </button>

      <div className="section-heading" style={{ marginTop: "25px" }}>
        <div>
          <span className="eyebrow">ESPACE PERSONNEL</span>
          <h2>Mon profil</h2>
          <p className="trip-location">
            Présente-toi à la communauté Adventure Trail.
          </p>
        </div>
      </div>

      {message && (
        <p style={{ color: "#D9B65D" }}>{message}</p>
      )}

      {error && (
        <p style={{ color: "#ff6666" }}>{error}</p>
      )}

      <form onSubmit={handleSave}>
        <article style={cardStyle}>
          <span className="eyebrow">IDENTITÉ</span>
          <h3>Ton profil public</h3>

          <div style={{ textAlign: "center", margin: "20px 0" }}>
            {photoFile ? (
              <img
                src={URL.createObjectURL(photoFile)}
                alt="Aperçu de la photo"
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : photoURL ? (
              <img
                src={photoURL}
                alt="Photo de profil"
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "50%",
                  background: "#292a25",
                  color: "#D9B65D",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "42px",
                }}
              >
                👤
              </div>
            )}
          </div>

          <label style={labelStyle}>Photo de profil</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setPhotoFile(event.target.files?.[0] || null)
            }
            style={inputStyle}
          />

          <label style={labelStyle}>Pseudo public *</label>
          <input
            value={pseudo}
            onChange={(event) => setPseudo(event.target.value)}
            placeholder="Exemple : Rider42"
            maxLength={30}
            required
            style={inputStyle}
          />
        </article>

        <article style={cardStyle}>
          <span className="eyebrow">PRATIQUE</span>
          <h3>Tes styles de conduite</h3>
          <p className="trip-location">
            Tu peux sélectionner plusieurs styles.
          </p>

          {ridingStyles.map((style) => (
            <label
              key={style}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 0",
                color: "#fff",
              }}
            >
              <input
                type="checkbox"
                checked={riding.includes(style)}
                onChange={() => toggleRidingStyle(style)}
              />
              {style}
            </label>
          ))}
        </article>

        <article style={cardStyle}>
          <span className="eyebrow">GARAGE</span>
          <h3>Mes motos</h3>
          <p className="trip-location">
            Tu peux enregistrer plusieurs motos.
          </p>

          {bikes.map((bike, index) => (
            <div
              key={index}
              style={{
                border: "1px solid rgba(217,182,93,0.2)",
                borderRadius: "10px",
                padding: "15px",
                marginTop: "15px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>Moto {index + 1}</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => removeBike(index)}
                >
                  Supprimer
                </button>
              </div>

              <label style={labelStyle}>Marque</label>
              <input
                value={bike.brand}
                onChange={(event) =>
                  updateBike(index, "brand", event.target.value)
                }
                placeholder="Exemple : Yamaha"
                style={inputStyle}
              />

              <label style={labelStyle}>Modèle</label>
              <input
                value={bike.model}
                onChange={(event) =>
                  updateBike(index, "model", event.target.value)
                }
                placeholder="Exemple : Ténéré"
                style={inputStyle}
              />

              <label style={labelStyle}>Cylindrée</label>
              <input
                value={bike.capacity}
                onChange={(event) =>
                  updateBike(index, "capacity", event.target.value)
                }
                placeholder="Exemple : 700 cm³"
                style={inputStyle}
              />
            </div>
          ))}

          <button
            type="button"
            className="text-button"
            onClick={addBike}
            style={{ marginTop: "15px" }}
          >
            + Ajouter une moto
          </button>
        </article>

        <article style={cardStyle}>
          <span className="eyebrow">LOCALISATION</span>
          <h3>D'où viens-tu ?</h3>

          <label style={labelStyle}>Ville</label>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Ta ville"
            style={inputStyle}
          />

          <label style={labelStyle}>Région / Département</label>
          <input
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            placeholder="Exemple : Nouvelle-Aquitaine / Landes"
            style={inputStyle}
          />

          <label style={labelStyle}>Pays</label>
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Exemple : France"
            style={inputStyle}
          />
        </article>

        <button
          type="submit"
          className="primary-button full-button"
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer mon profil →"}
        </button>
      </form>

      <article style={{ ...cardStyle, marginTop: "30px" }}>
        <span className="eyebrow">COMPTE</span>
        <h3>Informations de connexion</h3>

        <p>
          <strong>E-mail :</strong> {user.email}
        </p>

        <p>
          <strong>Connexion :</strong>{" "}
          {hasPasswordLogin ? "E-mail et mot de passe" : "Google"}
        </p>

        {hasPasswordLogin ? (
          <form onSubmit={handlePasswordChange}>
            <h3 style={{ marginTop: "25px" }}>
              Modifier mon mot de passe
            </h3>

            <label style={labelStyle}>
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(event.target.value)
              }
              autoComplete="current-password"
              style={inputStyle}
            />

            <label style={labelStyle}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              autoComplete="new-password"
              minLength={6}
              style={inputStyle}
            />

            <button
              type="submit"
              className="primary-button full-button"
            >
              Modifier le mot de passe
            </button>
          </form>
        ) : (
          <p className="trip-location">
            Ton compte utilise Google. La gestion du mot de passe se fait
            directement depuis ton compte Google.
          </p>
        )}
      </article>
    </section>
  );
}
