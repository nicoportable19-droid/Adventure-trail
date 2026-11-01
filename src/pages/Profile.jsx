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

import { auth, db } from "../firebase";

const ridingStyles = ["Trail Offroad", "Route", "Passagère"];

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
        const snapshot = await getDoc(profileRef);

        if (snapshot.exists()) {
          const data = snapshot.data();

          setPseudo(data.pseudo || "");
          setPhotoURL(data.photoURL || "");
          setRiding(data.riding || []);
          setBikes(data.bikes?.length ? data.bikes : [{ ...emptyBike }]);
          setCity(data.city || "");
          setRegion(data.region || "");
          setCountry(data.country || "");
        } else {
          setPseudo(user.displayName || "");
        }
      } catch (err) {
        console.error(err);
        setError("Impossible de charger ton profil.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  async function compressPhoto(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Le fichier choisi n'est pas une image.");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("La photo doit faire moins de 10 Mo.");
    }

    const imageURL = URL.createObjectURL(file);

    try {
      const image = new Image();

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = imageURL;
      });

      const maxSize = 500;
      const ratio = Math.min(
        1,
        maxSize / Math.max(image.width, image.height)
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * ratio);
      canvas.height = Math.round(image.height * ratio);

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Impossible de préparer la photo.");
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return canvas.toDataURL("image/jpeg", 0.65);
    } finally {
      URL.revokeObjectURL(imageURL);
    }
  }

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
      const profileData = {
        pseudo: pseudo.trim(),
        photoURL,
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

      setMessage("Profil enregistré avec succès !");
    } catch (err) {
      console.error(err);
      setError("Enregistrement impossible. Vérifie les règles Firestore.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("");
    setError("");

    try {
      const compressedPhoto = await compressPhoto(file);
      setPhotoURL(compressedPhoto);
      setMessage("Photo préparée. Enregistre ton profil pour la conserver.");
    } catch (err) {
      setError(err.message || "Impossible de préparer cette photo.");
    }

    event.target.value = "";
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
      console.error(err);

      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
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

      {message && <p style={{ color: "#D9B65D" }}>{message}</p>}
      {error && <p style={{ color: "#ff6666" }}>{error}</p>}

      <form onSubmit={handleSave}>
        <article style={cardStyle}>
          <span className="eyebrow">IDENTITÉ</span>
          <h3>Ton profil public</h3>

          <div style={{ textAlign: "center", margin: "20px 0" }}>
            {photoURL ? (
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
            onChange={handlePhotoChange}
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

        <p><strong>E-mail :</strong> {user.email}</p>

        <p>
          <strong>Connexion :</strong>{" "}
          {hasPasswordLogin ? "E-mail et mot de passe" : "Google"}
        </p>

        {hasPasswordLogin ? (
          <form onSubmit={handlePasswordChange}>
            <h3 style={{ marginTop: "25px" }}>
              Modifier mon mot de passe
            </h3>

            <label style={labelStyle}>Mot de passe actuel</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(event.target.value)
              }
              autoComplete="current-password"
              style={inputStyle}
            />

            <label style={labelStyle}>Nouveau mot de passe</label>
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

            <button type="submit" className="primary-button full-button">
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
