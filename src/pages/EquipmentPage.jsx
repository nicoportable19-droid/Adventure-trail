
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

export default function EquipmentPage({
  trip,
  tripMembers = [],
  onBack,
}) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tripId = trip?.id;
  const currentUid = auth.currentUser?.uid;

  const members = tripMembers.map((member) => ({
    ...member,
    uid: member.uid || member.id,
    displayName:
      member.firstName ||
      (member.uid === currentUid || member.id === currentUid
        ? "Moi"
        : "Rider"),
  }));

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
        setError("Impossible de préparer la check-list.");
      }
    }

    initializeChecklist();

    return unsubscribe;
  }, [tripId, currentUid]);

  async function addItem(event) {
    event.preventDefault();

    const name = newItem.trim();
    if (!name || !tripId || !currentUid) return;

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

  async function toggleItem(item, memberUid) {
    if (!tripId || !currentUid || memberUid !== currentUid) return;

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
    if (!tripId || !currentUid) return;

    if (
      !window.confirm(
        `Supprimer « ${item.name} » pour tous les participants ?`
      )
    ) {
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

  const departureDate =
    typeof trip?.dates === "string" ? trip.dates : "";

  const checkedCount = items.filter(
    (item) => item.broughtBy?.[currentUid]
  ).length;

  function renderTable(sectionItems) {
    return (
      <div className="equipment-table-scroll">
        <table className="equipment-table">
          <thead>
            <tr>
              <th>Équipement</th>

              {members.map((member) => (
                <th key={member.uid}>
                  {member.displayName}
                </th>
              ))}

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {sectionItems.map((item) => (
              <tr key={item.id}>
                <td className="equipment-name-cell">
                  {item.name}
                </td>

                {members.map((member) => {
                  const checked = Boolean(
                    item.broughtBy?.[member.uid]
                  );

                  const isMe = member.uid === currentUid;

                  return (
                    <td
                      key={member.uid}
                      className="equipment-check-cell"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!isMe}
                        onChange={() =>
                          toggleItem(item, member.uid)
                        }
                        aria-label={`${item.name} - ${member.displayName}`}
                      />
                    </td>
                  );
                })}

                <td className="equipment-action-cell">
                  {(item.createdBy === currentUid ||
                    trip.myRole === "owner") && (
                    <button
                      type="button"
                      className="equipment-delete"
                      onClick={() => removeItem(item)}
                      title="Supprimer cet élément"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="equipment-page">
      <button
        type="button"
        className="text-button"
        onClick={onBack}
      >
        ← Retour à l'aventure
      </button>

      <h2>🏍️ CHECK-LIST BIVOUAC MOTO TRAIL</h2>

      <p className="equipment-date">
        Date du départ : {departureDate || "À définir"}
      </p>

      <div className="equipment-progress">
        <strong>
          Ma préparation : {checkedCount} / {items.length} éléments
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

      <form
        onSubmit={addItem}
        className="equipment-add-form"
      >
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

      {error && (
        <p className="equipment-error">{error}</p>
      )}

      {loading ? (
        <p>Chargement de la check-list...</p>
      ) : (
        <>
          {checklist.map((section) => {
            const sectionItems = items.filter(
              (item) => item.category === section.category
            );

            return (
              <section
                className="equipment-category"
                key={section.category}
              >
                <h3>{section.category}</h3>
                {renderTable(sectionItems)}
              </section>
            );
          })}

          {items.some(
            (item) => item.category === "➕ MATÉRIEL AJOUTÉ"
          ) && (
            <section className="equipment-category">
              <h3>➕ MATÉRIEL AJOUTÉ</h3>

              {renderTable(
                items.filter(
                  (item) => item.category === "➕ MATÉRIEL AJOUTÉ"
                )
              )}
            </section>
          )}
        </>
      )}

      <p className="equipment-hint">
        Chaque participant coche sa propre colonne. Les modifications
        sont partagées avec toute l'équipe.
      </p>
    </div>
  );
}
