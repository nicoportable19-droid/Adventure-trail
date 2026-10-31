
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const checklist = [
  {
    category: "⛺ DODO",
    items: [
      "Tente / tarp",
      "Sac de couchage",
      "Matelas",
      "Oreiller gonflable",
      "Lampe frontale",
      "Bouchons d’oreilles",
    ],
  },
  {
    category: "🍳 CUISINE & REPAS",
    items: [
      "Réchaud + cartouche",
      "Popote / casserole",
      "Couverts",
      "Tasse",
      "Briquet",
      "Repas / lyophilisés",
      "Petit-déjeuner / café",
      "Barres énergétiques / encas",
      "Gourde / poche à eau",
      "Filtre à eau / pastilles",
    ],
  },
  {
    category: "👕 VÊTEMENTS",
    items: [
      "Sous-vêtements de rechange",
      "Chaussettes de rechange",
      "Vêtements pour le soir",
      "Couche chaude / polaire",
      "Veste de pluie",
      "Tour de cou",
      "Bonnet",
      "Gants de rechange",
    ],
  },
  {
    category: "🧼 HYGIÈNE",
    items: [
      "Brosse à dents / dentifrice",
      "Papier toilette",
      "Gel hydroalcoolique",
      "Serviette microfibre",
      "Sac pour les déchets",
      "Crème solaire",
    ],
  },
  {
    category: "🔧 OUTILS & MOTO",
    items: [
      "Trousse à outils",
      "Kit réparation pneus",
      "Pompe / mini-compresseur",
      "Manomètre",
      "Chambre à air / mèches selon les roues",
      "Démonte-pneus si nécessaire",
      "Colliers Rilsan",
      "Ruban adhésif solide",
      "Lubrifiant chaîne",
      "Chiffon",
      "Sangle de traction",
      "Multi-tool",
    ],
  },
  {
    category: "🩹 SÉCURITÉ & NAVIGATION",
    items: [
      "Trousse de premiers secours",
      "Couverture de survie",
      "Téléphone chargé",
      "Powerbank + câbles",
      "GPS / cartes hors ligne",
      "Papiers moto / permis / assurance",
      "Argent liquide / carte bancaire",
      "Itinéraire partagé",
    ],
  },
  {
    category: "🎒 MATÉRIEL DIVERS",
    items: [
      "Sacs étanches",
      "Sacs-poubelle",
      "Cadenas",
      "Lunettes de soleil",
      "Couteau / outil multifonction",
      "Briquet de secours",
      "Bâche de sol",
      "Bouchons d’oreilles",
    ],
  },
  {
    category: "✅ DERNIÈRES VÉRIFICATIONS",
    items: [
      "Pression des pneus",
      "Niveau d’huile / carburant",
      "Graissage de chaîne",
      "Éclairage / freins",
      "Chargement bien fixé",
      "Rien ne touche la roue ou l’échappement",
      "Météo vérifiée",
      "Bivouac autorisé sur le lieu choisi",
    ],
  },
];

export default function EquipmentPage({ trip }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tripId = trip?.id;
  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!tripId) return;

    const itemsRef = collection(db, "trips", tripId, "equipment");
    const configRef = doc(db, "trips", tripId, "equipment", "_config");

    const unsubscribe = onSnapshot(
      itemsRef,
      (snapshot) => {
        const loadedItems = snapshot.docs
          .filter((itemDoc) => itemDoc.id !== "_config")
          .map((itemDoc) => ({
            id: itemDoc.id,
            ...itemDoc.data(),
          }));

        setItems(loadedItems);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError("Impossible de charger la liste. Vérifie les règles Firebase.");
      }
    );

    async function initializeChecklist() {
      try {
        const configSnapshot = await getDoc(configRef);

        if (configSnapshot.exists()) return;

        const batch = writeBatch(db);
        let index = 0;

        checklist.forEach((section) => {
          section.items.forEach((name) => {
            index += 1;

            const itemRef = doc(
              db,
              "trips",
              tripId,
              "equipment",
              `base-${String(index).padStart(3, "0")}`
            );

            batch.set(itemRef, {
              name,
              category: section.category,
              broughtBy: {},
              createdBy: currentUid,
              isDefault: true,
              createdAt: serverTimestamp(),
            });
          });
        });

        batch.set(configRef, {
          initialized: true,
          createdAt: serverTimestamp(),
        });

        await batch.commit();
      } catch {
        setError("Impossible de préparer la check-list. Vérifie les règles Firebase.");
      }
    }

    initializeChecklist();

    return unsubscribe;
  }, [tripId, currentUid]);

  async function addItem(event) {
    event.preventDefault();

    const name = newItem.trim();
    if (!name || !tripId) return;

    try {
      await addDoc(collection(db, "trips", tripId, "equipment"), {
        name,
        category: "➕ MATÉRIEL AJOUTÉ",
        broughtBy: {},
        createdBy: currentUid,
        isDefault: false,
        createdAt: serverTimestamp(),
      });

      setNewItem("");
      setError("");
    } catch {
      setError("Impossible d'ajouter cet élément.");
    }
  }

  async function toggleItem(item) {
    if (!tripId || !currentUid) return;

    try {
      const updated = { ...(item.broughtBy || {}) };

      if (updated[currentUid]) {
        delete updated[currentUid];
      } else {
        updated[currentUid] = true;
      }

      await updateDoc(
        doc(db, "trips", tripId, "equipment", item.id),
        { broughtBy: updated }
      );

      setError("");
    } catch {
      setError("Impossible de modifier cet élément.");
    }
  }

  async function removeItem(item) {
    if (!tripId) return;

    if (!window.confirm(`Supprimer « ${item.name} » pour tout le monde ?`)) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "trips", tripId, "equipment", item.id)
      );
      setError("");
    } catch {
      setError("Impossible de supprimer cet élément.");
    }
  }

  const sections = checklist.map((section) => ({
    ...section,
    items: items.filter((item) => item.category === section.category),
  }));

  const customItems = items.filter(
    (item) => item.category === "➕ MATÉRIEL AJOUTÉ"
  );

  const checkedCount = items.filter(
    (item) => item.broughtBy?.[currentUid]
  ).length;

  const departureDate =
    typeof trip?.dates === "string" ? trip.dates : "";

  return (
    <div className="equipment-page">
      <h2>🏍️ CHECK-LIST BIVOUAC MOTO TRAIL</h2>

      <p className="equipment-date">
        Date du départ : {departureDate || "À définir"}
      </p>

      <div className="equipment-progress">
        <strong>
          {checkedCount} / {items.length} éléments pris en charge par toi
        </strong>
        <div className="equipment-progress-track">
          <div
            className="equipment-progress-fill"
            style={{
              width: items.length
                ? `${(checkedCount / items.length) * 100}%`
                : "0%",
            }}
          />
        </div>
      </div>

      <form onSubmit={addItem} className="equipment-add-form">
        <input
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Ajouter un équipement..."
          maxLength={100}
        />
        <button type="submit" disabled={!newItem.trim()}>
          + Ajouter
        </button>
      </form>

      {error && <p className="equipment-error">{error}</p>}

      {loading ? (
        <p>Préparation de la check-list...</p>
      ) : (
        <>
          {sections.map((section) => (
            <section className="equipment-category" key={section.category}>
              <h3>{section.category}</h3>

              {section.items.map((item) => {
                const checked = Boolean(item.broughtBy?.[currentUid]);
                const peopleCount = Object.keys(item.broughtBy || {}).length;

                return (
                  <div className="equipment-item" key={item.id}>
                    <label className="equipment-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item)}
                      />
                      <span className={checked ? "equipment-done" : ""}>
                        {item.name}
                      </span>
                    </label>

                    <small>
                      {peopleCount > 0
                        ? `${peopleCount} participant(s)`
                        : "À prendre"}
                    </small>

                    <button
                      type="button"
                      className="equipment-delete"
                      onClick={() => removeItem(item)}
                      title="Supprimer cet élément pour tout le monde"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </section>
          ))}

          {customItems.length > 0 && (
            <section className="equipment-category">
              <h3>➕ MATÉRIEL AJOUTÉ</h3>

              {customItems.map((item) => {
                const checked = Boolean(item.broughtBy?.[currentUid]);
                const peopleCount = Object.keys(item.broughtBy || {}).length;

                return (
                  <div className="equipment-item" key={item.id}>
                    <label className="equipment-checkbox">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item)}
                      />
                      <span className={checked ? "equipment-done" : ""}>
                        {item.name}
                      </span>
                    </label>

                    <small>
                      {peopleCount > 0
                        ? `${peopleCount} participant(s)`
                        : "À prendre"}
                    </small>

                    <button
                      type="button"
                      className="equipment-delete"
                      onClick={() => removeItem(item)}
                      title="Supprimer cet élément pour tout le monde"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
