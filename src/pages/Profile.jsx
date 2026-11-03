
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

const defaultEquipmentCategories = [
  {
    name: "Équipement pilote",
    items: [
      "Casque",
      "Gants",
      "Bottes",
      "Veste de protection",
      "Pantalon de protection",
    ],
  },
  {
    name: "Matériel moto",
    items: [
      "Trousse à outils",
      "Kit réparation crevaison",
      "Sangles",
      "Antivol",
      "Lubrifiant chaîne",
    ],
  },
  {
    name: "Navigation",
    items: [
      "Téléphone / GPS",
      "Support téléphone",
      "Chargeur / batterie externe",
    ],
  },
  {
    name: "Sécurité et secours",
    items: [
      "Trousse de premiers secours",
      "Lampe",
      "Gilet réfléchissant",
    ],
  },
  {
    name: "Confort",
    items: [
      "Gourde",
      "Sac à dos",
      "Lunettes de soleil",
      "Protection pluie",
    ],
  },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createBaseEquipmentList() {
  return {
    id: createId(),
    name: "Matériel de base",
    items: defaultEquipmentCategories.flatMap((category) =>
      category.items.map((name) => ({
        id: createId(),
        name,
        category: category.name,
        selected: true,
      }))
    ),
  };
}

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

  // Listes personnelles de matériel
  const [equipmentLists, setEquipmentLists] = useState([]);
  const [activeEquipmentListId, setActiveEquipmentListId] = useState("");
  const [newListName, setNewListName] = useState("");
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [newEquipmentCategory, setNewEquipmentCategory] = useState("Matériel moto");
  const [savingEquipment, setSavingEquipment] = useState(false);

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

          const savedLists = Array.isArray(data.equipmentLists)
            ? data.equipmentLists
            : [];

          const initialLists = savedLists.length
            ? savedLists
            : [createBaseEquipmentList()];

          setEquipmentLists(initialLists);
          setActiveEquipmentListId(initialLists[0].id);
        } else {
          const initialList = createBaseEquipmentList();
          setEquipmentLists([initialList]);
          setActiveEquipmentListId(initialList.id);
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

  // Gestion des listes de matériel
  const activeEquipmentList = equipmentLists.find(
    (list) => list.id === activeEquipmentListId
  );

  function updateEquipmentList(listId, updater) {
    setEquipmentLists((current) =>
      current.map((list) =>
        list.id === listId ? updater(list) : list
      )
    );
  }

  function createEquipmentList() {
    if (equipmentLists.length >= 9) {
      setError("Tu peux créer jusqu'à 9 listes de matériel.");
      return;
    }

    const name = newListName.trim();

    if (!name) {
      setError("Donne un nom à ta nouvelle liste.");
      return;
    }

    const newList = {
      id: createId(),
      name,
      items: [],
    };

    setEquipmentLists((current) => [...current, newList]);
    setActiveEquipmentListId(newList.id);
    setNewListName("");
    setError("");
    setMessage("Nouvelle liste créée. Pense à enregistrer tes listes.");
  }

  // Dupliquer une liste avec tous ses équipements
  function duplicateEquipmentList() {
    if (!activeEquipmentList) return;

    if (equipmentLists.length >= 9) {
      setError("Tu peux créer jusqu'à 9 listes de matériel.");
      setMessage("");
      return;
    }

    const duplicatedList = {
      id: createId(),
      name: `Copie de ${activeEquipmentList.name}`.slice(0, 40),
      items: (activeEquipmentList.items || []).map((item) => ({
        ...item,
        id: createId(),
      })),
    };

    setEquipmentLists((current) => [...current, duplicatedList]);
    setActiveEquipmentListId(duplicatedList.id);
    setError("");
    setMessage(
      "Liste dupliquée. Tu peux maintenant la modifier indépendamment, puis enregistrer tes listes."
    );
  }

  function renameEquipmentList() {
    if (!activeEquipmentList) return;

    const name = window.prompt(
      "Nouveau nom de la liste :",
      activeEquipmentList.name
    );

    if (name === null) return;

    if (!name.trim()) {
      setError("Le nom de la liste ne peut pas être vide.");
      return;
    }

    updateEquipmentList(activeEquipmentList.id, (list) => ({
      ...list,
      name: name.trim(),
    }));

    setMessage("Nom de la liste modifié. Pense à enregistrer tes listes.");
    setError("");
  }

  function deleteEquipmentList() {
    if (!activeEquipmentList) return;

    if (equipmentLists.length <= 1) {
      setError("Tu dois conserver au moins une liste de matériel.");
      return;
    }

    const confirmed = window.confirm(
      `Supprimer la liste « ${activeEquipmentList.name} » ?`
    );

    if (!confirmed) return;

    const remainingLists = equipmentLists.filter(
      (list) => list.id !== activeEquipmentList.id
    );

    setEquipmentLists(remainingLists);
    setActiveEquipmentListId(remainingLists[0].id);
    setMessage("Liste supprimée. Pense à enregistrer tes listes.");
    setError("");
  }

  function toggleEquipment(itemId) {
    if (!activeEquipmentList) return;

    updateEquipmentList(activeEquipmentList.id, (list) => ({
      ...list,
      items: list.items.map((item) =>
        item.id === itemId
          ? { ...item, selected: !item.selected }
          : item
      ),
    }));
  }

  function addEquipment(event) {
    event.preventDefault();

    if (!activeEquipmentList) return;

    const name = newEquipmentName.trim();

    if (!name) {
      setError("Entre le nom de l'équipement à ajouter.");
      return;
    }

    updateEquipmentList(activeEquipmentList.id, (list) => ({
      ...list,
      items: [
        ...list.items,
        {
          id: createId(),
          name,
          category: newEquipmentCategory,
          selected: true,
        },
      ],
    }));

    setNewEquipmentName("");
    setError("");
    setMessage("Équipement ajouté. Pense à enregistrer tes listes.");
  }

  function removeEquipment(itemId) {
    if (!activeEquipmentList) return;

    updateEquipmentList(activeEquipmentList.id, (list) => ({
      ...list,
      items: list.items.filter((item) => item.id !== itemId),
    }));
  }

  async function saveEquipmentLists() {
    if (!user?.uid || savingEquipment) return;

    setSavingEquipment(true);
    setError("");
    setMessage("");

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          equipmentLists,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Tes listes de matériel ont bien été enregistrées !");
    } catch (err) {
      console.error("Enregistrement des listes :", err);
      setError(
        "Impossible d'enregistrer les listes : " + err.message
      );
    } finally {
      setSavingEquipment(false);
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

      if (email.trim() && email.trim() !== user.email) {
        await updateEmail(auth.currentUser, email.trim());
      }

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

  const equipmentCategories = [
    ...new Set(
      (activeEquipmentList?.items || []).map((item) => item.category)
    ),
  ];

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
          padding: 28px 30px;
          border: 1px solid rgba(217,182,93,.22);
          border-radius: 18px;
          background:
            radial-gradient(circle at 90% 10%, rgba(217,182,93,.13), transparent 34%),
            linear-gradient(135deg, #20211d 0%, #171814 72%);
        }

        .profile-page .profile-heading h2 {
          margin: 8px 0;
        }

        .profile-page .profile-subtitle {
          color: #aaa;
          margin: 0;
        }

        .profile-page .profile-card {
          position: relative;
          overflow: hidden;
          background: var(--profile-card);
          border: 1px solid var(--profile-border);
          border-radius: 14px;
          padding: 24px;
          min-width: 0;
          box-shadow: 0 12px 32px rgba(0,0,0,.14);
          transition: border-color .2s ease, box-shadow .2s ease;
        }

        .profile-page .profile-card:hover {
          border-color: rgba(217,182,93,.38);
          box-shadow: 0 16px 38px rgba(0,0,0,.2);
        }

        .profile-page .profile-card h3 {
          margin: 8px 0 20px;
          font-size: 20px;
          letter-spacing: -.3px;
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

        .profile-page .profile-field input,
        .profile-page .profile-field select {
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
          transition: border-color .2s ease, background .2s ease;
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
          min-height: 48px;
          margin: 26px 0 10px;
          border-radius: 10px;
          letter-spacing: .2px;
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

        .profile-page .equipment-list-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin: 18px 0;
          padding: 14px;
          border: 1px solid rgba(217,182,93,.18);
          border-radius: 12px;
          background: rgba(255,255,255,.025);
        }

        .profile-page .equipment-list-toolbar select {
          flex: 1;
          min-width: 180px;
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid #4a493d;
          border-radius: 9px;
          background: #24251f;
          color: #f0eadb;
          color-scheme: dark;
        }

        .profile-page .equipment-list-toolbar select option {
          background: #24251f;
          color: #f0eadb;
        }

        .profile-page .equipment-list-toolbar button,
        .profile-page .equipment-create button {
          min-height: 42px;
          border-radius: 9px;
          transition: background .18s ease, border-color .18s ease, transform .18s ease;
        }

        .profile-page .equipment-list-toolbar button:hover:not(:disabled),
        .profile-page .equipment-create button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: var(--profile-sand);
        }

        .profile-page .equipment-duplicate-button {
          border-color: rgba(217,182,93,.48);
          color: var(--profile-light);
          background: rgba(217,182,93,.07);
        }

        .profile-page .equipment-category {
          margin-top: 22px;
          padding: 15px 16px 10px;
          border: 1px solid rgba(255,255,255,.055);
          border-radius: 12px;
          background: rgba(255,255,255,.018);
        }

        .profile-page .equipment-category h4 {
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--profile-light);
          margin: 12px 0;
          font-size: 14px;
          letter-spacing: .5px;
          text-transform: uppercase;
        }

        .profile-page .equipment-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          margin: 7px 0;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 8px;
          background: #20211d;
          transition: background .18s ease, border-color .18s ease;
        }

        .profile-page .equipment-item:hover {
          background: rgba(217,182,93,.055);
          border-color: rgba(217,182,93,.25);
        }

        .profile-page .equipment-item label {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
          cursor: pointer;
        }

        .profile-page .equipment-item label span {
          overflow-wrap: anywhere;
        }

        .profile-page .equipment-item input {
          accent-color: var(--profile-sand);
          width: 17px;
          height: 17px;
          flex: 0 0 auto;
        }

        .profile-page .equipment-item button {
          flex: 0 0 auto;
        }

        .profile-page .equipment-add-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(150px, .7fr) auto;
          gap: 10px;
          align-items: end;
          margin-top: 22px;
        }

        .profile-page .equipment-add-form .profile-field {
          margin: 0;
        }

        .profile-page .equipment-create {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 24px;
          padding: 20px 0 0;
          border-top: 1px solid #38382f;
        }

        .profile-page .equipment-create input {
          flex: 1;
          min-width: 160px;
        }

        .profile-page .equipment-count {
          margin-left: auto;
          padding: 7px 11px;
          border: 1px solid rgba(217,182,93,.2);
          border-radius: 999px;
          color: var(--profile-light);
          background: rgba(217,182,93,.06);
          font-size: 12px;
        }

        .profile-page button:disabled {
          opacity: .42;
          cursor: not-allowed;
        }

        @media (max-width: 700px) {
          .profile-page .equipment-add-form {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .profile-page .profile-heading {
            padding: 22px 18px;
          }

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

          .profile-page .equipment-list-toolbar {
            align-items: stretch;
          }

          .profile-page .equipment-list-toolbar select {
            flex-basis: 100%;
          }

          .profile-page .equipment-list-toolbar button {
            flex: 1;
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

      <section className="profile-card profile-section">
        <span className="eyebrow">06 — MES LISTES DE MATÉRIEL</span>
        <h3>Mon équipement favori</h3>
        <p className="profile-muted">
          Prépare tes listes personnelles. Tu pourras ensuite les reprendre
          dans une aventure sans modifier tes listes favorites.
        </p>

        <div className="equipment-list-toolbar">
          <select
            value={activeEquipmentListId}
            onChange={(e) => setActiveEquipmentListId(e.target.value)}
            aria-label="Choisir une liste de matériel"
          >
            {equipmentLists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="outline-button"
            onClick={renameEquipmentList}
            disabled={!activeEquipmentList}
          >
            Renommer
          </button>

          <button
            type="button"
            className="outline-button equipment-duplicate-button"
            onClick={duplicateEquipmentList}
            disabled={!activeEquipmentList || equipmentLists.length >= 9}
          >
            ⧉ Dupliquer
          </button>

          <button
            type="button"
            className="outline-button"
            onClick={deleteEquipmentList}
            disabled={equipmentLists.length <= 1}
          >
            Supprimer
          </button>
        </div>

        {activeEquipmentList && (
          <>
            {activeEquipmentList.items.length === 0 && (
              <p className="profile-muted">
                Cette liste est vide. Ajoute ton premier équipement ci-dessous.
              </p>
            )}

            {equipmentCategories.map((category) => (
              <div className="equipment-category" key={category}>
                <h4>{category}</h4>

                {activeEquipmentList.items
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <div className="equipment-item" key={item.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(item.selected)}
                          onChange={() => toggleEquipment(item.id)}
                        />
                        <span>{item.name}</span>
                      </label>

                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => removeEquipment(item.id)}
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
              </div>
            ))}

            <form className="equipment-add-form" onSubmit={addEquipment}>
              <div className="profile-field">
                <label htmlFor="new-equipment-name">
                  Nouvel équipement
                </label>
                <input
                  id="new-equipment-name"
                  value={newEquipmentName}
                  onChange={(e) => setNewEquipmentName(e.target.value)}
                  placeholder="Ex. : Sacoche de réservoir"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="new-equipment-category">Catégorie</label>
                <select
                  id="new-equipment-category"
                  value={newEquipmentCategory}
                  onChange={(e) => setNewEquipmentCategory(e.target.value)}
                >
                  {defaultEquipmentCategories.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <button type="submit" className="outline-button">
                + Ajouter
              </button>
            </form>
          </>
        )}

        <div className="equipment-create">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Nom de la nouvelle liste"
            maxLength={40}
            aria-label="Nom de la nouvelle liste"
          />

          <button
            type="button"
            className="outline-button"
            onClick={createEquipmentList}
            disabled={equipmentLists.length >= 9}
          >
            + Créer une liste
          </button>

          <span className="equipment-count">
            {equipmentLists.length}/9 listes
          </span>
        </div>

        <p className="profile-muted">
          Les cases cochées indiquent les équipements que tu souhaites
          conserver dans cette liste favorite. Ce ne sont pas encore les
          cases « matériel chargé » d'une aventure.
        </p>

        <button
          type="button"
          className="primary-button full-button profile-save"
          onClick={saveEquipmentLists}
          disabled={savingEquipment}
        >
          {savingEquipment
            ? "Enregistrement..."
            : "Enregistrer mes listes de matériel →"}
        </button>
      </section>
    </main>
  );
}
