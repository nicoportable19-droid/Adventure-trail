
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
  GoogleAuthProvider,
  reauthenticateWithPopup,
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
    } catch (err) {
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
      const profileData = {
        pseudo: pseudo.trim(),
        photoURL,
        riding,
        bikes: bikes.filter(
          (bike) => bike.make.trim() || bike.model.trim() || bike.capacity.trim()
        ),
        city: city.trim(),
        region: region.trim(),
        country: country.trim(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", user.uid), profileData, {
        merge: true,
      });

      if (email.trim() && email.trim() !== user.email) {
        await updateEmail(auth.currentUser, email.trim());
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error("Le nouveau mot de passe doit contenir au moins 6 caractères.");
        }

        if (user.providerData.some((provider) => provider.providerId === "password")) {
          if (!currentPassword) {
            throw new Error("Entre ton mot de passe actuel pour le modifier.");
          }

          const credential = EmailAuthProvider.credential(
            user.email,
            currentPassword
          );

          await reauthenticateWithCredential(auth.currentUser, credential);
        }

        await updatePassword(auth.currentUser, newPassword);
      }

      setCurrentPassword("");
      setNewPassword("");
      setMessage("Profil enregistré avec succès !");
    } catch (err) {
      console.error("Enregistrement du profil :", err);
      setError(err.message || "Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="trips-section"><p>Chargement du profil...</p></main>;
  }

  return (
    <main className="trips-section">
      <button type="button" className="text-button" onClick={onBack}>
        ← Retour
      </button>

      <div className="section-heading" style={{ marginTop: 25 }}>
        <div>
          <span className="eyebrow">ESPACE PERSONNEL</span>
          <h2>Mon profil</h2>
          <p className="trip-location">
            Tes informations et ton identité de rider.
          </p>
        </div>
      </div>

      {error && <p role="alert" style={{ color: "#ff7777" }}>{error}</p>}
      {message && <p style={{ color: "#D9B65D" }}>{message}</p>}

      <form onSubmit={saveProfile}>
        <div className="trip-grid">
          <section className="trip-card">
            <div className="trip-info">
              <span className="eyebrow">IDENTITÉ</span>
              <h3>Ma photo et mon pseudo</h3>

              {photoURL && (
                <img
                  src={photoURL}
                  alt="Photo de profil"
                  style={{
                    width: 110,
                    height: 110,
                    objectFit: "cover",
                    borderRadius: "50%",
                    marginBottom: 15,
                  }}
                />
              )}

              <label>Photo de profil</label>
              <input type="file" accept="image/*" onChange={handlePhoto} />

              <label>Pseudo public</label>
              <input
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="Ton pseudo de rider"
                maxLength={30}
              />
            </div>
          </section>

          <section className="trip-card">
            <div className="trip-info">
              <span className="eyebrow">PRATIQUE</span>
              <h3>Mon style de conduite</h3>

              {ridingOptions.map((option) => (
                <label
                  key={option}
                  style={{ display: "flex", gap: 10, margin: "12px 0" }}
                >
                  <input
                    type="checkbox"
                    checked={riding.includes(option)}
                    onChange={() => toggleRiding(option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </section>
        </div>

        <section className="trip-card" style={{ marginTop: 20 }}>
          <div className="trip-info">
            <span className="eyebrow">GARAGE</span>
            <h3>Mes motos</h3>

            {bikes.map((bike, index) => (
              <div
                key={index}
                style={{
                  borderBottom: "1px solid #444",
                  paddingBottom: 18,
                  marginBottom: 18,
                }}
              >
                <label>Marque</label>
                <input
                  value={bike.make}
                  onChange={(e) => updateBike(index, "make", e.target.value)}
                  placeholder="Ex. : Yamaha"
                />

                <label>Modèle</label>
                <input
                  value={bike.model}
                  onChange={(e) => updateBike(index, "model", e.target.value)}
                  placeholder="Ex. : Ténéré 700"
                />

                <label>Cylindrée (cm³)</label>
                <input
                  value={bike.capacity}
                  onChange={(e) => updateBike(index, "capacity", e.target.value)}
                  placeholder="Ex. : 700"
                />

                <button
                  type="button"
                  className="outline-button"
                  onClick={() => removeBike(index)}
                >
                  Supprimer cette moto
                </button>
              </div>
            ))}

            <button type="button" className="outline-button" onClick={addBike}>
              + Ajouter une moto
            </button>
          </div>
        </section>

        <section className="trip-card" style={{ marginTop: 20 }}>
          <div className="trip-info">
            <span className="eyebrow">ORIGINES</span>
            <h3>Ma région</h3>

            <label>Ville</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />

            <label>Région ou département</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} />

            <label>Pays</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </section>

        <section className="trip-card" style={{ marginTop: 20 }}>
          <div className="trip-info">
            <span className="eyebrow">COMPTE</span>
            <h3>Mes informations de connexion</h3>

            <label>Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {user.providerData.some((provider) => provider.providerId === "password") && (
              <>
                <label>Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </>
            )}

            <label>Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Laisser vide pour ne pas changer"
              autoComplete="new-password"
            />

            <p className="trip-location">
              La modification de l'e-mail ou du mot de passe peut nécessiter
              une nouvelle authentification.
            </p>
          </div>
        </section>

        <button
          type="submit"
          className="primary-button full-button"
          style={{ marginTop: 25 }}
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer mon profil →"}
        </button>
      </form>
    </main>
  );
}
