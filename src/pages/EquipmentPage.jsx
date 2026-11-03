
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

  const members = [
    ...tripMembers.filter((member) => member.uid !== currentUid),
    {
      id: currentUid,
      uid: currentUid,
      firstName:
        tripMembers.find((member) => member.uid === currentUid)?.firstName ||
        "Moi",
    },
  ].filter(
    (member, index, array) =>
      member.uid &&
      array.findIndex((other) => other.uid === member.uid) === index
  );

  // Initialisation de la check-list et import du modèle favori
  useEffect(() => {
    if (!tripId || !currentUid) return;

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
        setError(
          "Impossible de charger la liste. Vérifie les règles Firebase."
        );
      }
    );

    async function initializeChecklist() {
      try {
        const configSnapshot = await getDoc(configRef);

        // La liste a déjà été initialisée : ne rien importer à nouveau.
        if (configSnapshot.exists()) return;

        const batch = writeBatch(db);
        let index = 0;

        // 1. Ajouter la check-list de base
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
              toTakeBy: {},
              takenBy: {},
              broughtBy: {},
              createdBy: currentUid,
              isDefault: true,
              createdAt: serverTimestamp(),
            });
          });
        });

        // 2. Importer les équipements de la liste favorite choisie
        const preset = trip.equipmentPreset;

        if (preset && Array.isArray(preset.items)) {
          preset.items.forEach((item, favoriteIndex) => {
            if (!item.name?.trim()) return;

            const itemRef = doc(
              db,
              "trips",
              tripId,
              "equipment",
              `favorite-${String(favoriteIndex + 1).padStart(3, "0")}`
            );

            batch.set(itemRef, {
              name: item.name.trim(),
              category:
                item.category || "⭐ MATÉRIEL PERSONNALISÉ",
              toTakeBy: {},
              takenBy: {},
              broughtBy: {},
              createdBy: currentUid,
              isDefault: false,
              isFavoritePreset: true,
              sourceListName: preset.listName || "",
              createdAt: serverTimestamp(),
            });
          });
        }

        // 3. Marquer la check-list comme initialisée
        batch.set(configRef, {
          initialized: true,
          favoriteListName: trip.equipmentPreset?.listName || null,
          createdAt: serverTimestamp(),
        });

        await batch.commit();
        setError("");
      } catch (initializationError) {
        console.error(
          "Initialisation de la check-list :",
          initializationError
        );

        setError(
          "Impossible de préparer la check-list. Vérifie les règles Firebase."
        );
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
        toTakeBy: {},
        takenBy: {},
        broughtBy: {},
        createdBy: currentUid,
        isDefault: false,
        createdAt: serverTimestamp(),
      });

      setNewItem("");
      setError("");
    } catch (addError) {
      console.error(addError);
      setError("Impossible d'ajouter cet élément.");
    }
  }

  // Tout le monde peut modifier les cases « À prendre ».
  async function toggleToTake(item, memberUid) {
    if (!tripId || !currentUid || !memberUid) return;

    const checked = Boolean(item.toTakeBy?.[memberUid]);

    try {
      await updateDoc(
        doc(db, "trips", tripId, "equipment", item.id),
        {
          [`toTakeBy.${memberUid}`]: !checked,
        }
      );

      setError("");
    } catch (toggleError) {
      console.error(toggleError);
      setError("Impossible de modifier la case « À prendre ».");
    }
  }

  // Seul le participant concerné peut modifier sa case « Pris ».
  async function toggleTaken(item) {
    if (!tripId || !currentUid) return;

    const checked = Boolean(
      item.takenBy?.[currentUid] || item.broughtBy?.[currentUid]
    );

    try {
      await updateDoc(
        doc(db, "trips", tripId, "equipment", item.id),
        {
          [`takenBy.${currentUid}`]: !checked,
        }
      );

      setError("");
    } catch (toggleError) {
      console.error(toggleError);
      setError("Impossible de modifier ta case « Pris ».");
    }
  }

  async function removeItem(item) {
    if (!tripId || !currentUid) return;

    const canDelete =
      trip.myRole === "owner" || item.createdBy === currentUid;

    if (!canDelete) {
      setError(
        "Seul le créateur ou l'organisateur peut supprimer cet élément."
      );
      return;
    }

    if (
      !window.confirm(
        `Supprimer « ${item.name} » pour tout le monde ?`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "trips", tripId, "equipment", item.id)
      );

      setError("");
    } catch (deleteError) {
      console.error(deleteError);
      setError("Impossible de supprimer cet élément.");
    }
  }

  // Équipements ajoutés manuellement
  const customItems = items.filter(
    (item) => item.category === "➕ MATÉRIEL AJOUTÉ"
  );

  // Catégories de la check-list de base
  const sections = checklist.map((section) => ({
    ...section,
    items: items.filter(
      (item) => item.category === section.category
    ),
  }));

  // Catégories supplémentaires issues des listes favorites
  const baseCategories = checklist.map(
    (section) => section.category
  );

  const favoriteCategories = [
    ...new Set(
      items
        .filter(
          (item) =>
            item.isFavoritePreset &&
            !baseCategories.includes(item.category)
        )
        .map((item) => item.category)
    ),
  ];

  const extraFavoriteSections = favoriteCategories.map(
    (category) => ({
      category,
      items: items.filter(
        (item) =>
          item.category === category &&
          item.isFavoritePreset
      ),
    })
  );

  const checkedCount = items.filter(
    (item) =>
      item.takenBy?.[currentUid] ||
      item.broughtBy?.[currentUid]
  ).length;

  const departureDate =
    typeof trip?.dates === "string" ? trip.dates : "";

  function renderTable(sectionItems) {
    if (!sectionItems.length) {
      return null;
    }

    return (
      <div className="equipment-table-scroll">
        <table className="equipment-table">
          <thead>
            <tr>
              <th
                className="equipment-name-column"
                rowSpan="2"
              >
                Équipement
              </th>

              {members.map((member) => (
                <th key={member.uid} colSpan="2">
                  {member.firstName || "Rider"}
                </th>
              ))}

              <th rowSpan="2"> </th>
            </tr>

            <tr>
              {members.map((member) => (
                <>
                  <th
                    key={`${member.uid}-take`}
                    className="equipment-take-heading"
                  >
                    À prendre
                  </th>

                  <th
                    key={`${member.uid}-taken`}
                    className="equipment-taken-heading"
                  >
                    Pris
                  </th>
                </>
              ))}
            </tr>
          </thead>

          <tbody>
            {sectionItems.map((item) => {
              const canDelete =
                trip.myRole === "owner" ||
                item.createdBy === currentUid;

              return (
                <tr key={item.id}>
                  <td className="equipment-name-column">
                    {item.name}

                    {item.isFavoritePreset && (
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          opacity: 0.65,
                          marginTop: "3px",
                        }}
                      >
                        Liste favorite
                      </span>
                    )}
                  </td>

                  {members.map((member) => {
                    const isMe = member.uid === currentUid;

                    const toTakeChecked = Boolean(
                      item.toTakeBy?.[member.uid]
                    );

                    const takenChecked = Boolean(
                      item.takenBy?.[member.uid] ||
                      item.broughtBy?.[member.uid]
                    );

                    return (
                      <>
                        <td
                          key={`${member.uid}-take`}
                          className="equipment-check-cell equipment-take-cell"
                        >
                          <input
                            type="checkbox"
                            checked={toTakeChecked}
                            onChange={() =>
                              toggleToTake(item, member.uid)
                            }
                            aria-label={`${item.name} : à prendre pour ${member.firstName}`}
                          />
                        </td>

                        <td
                          key={`${member.uid}-taken`}
                          className="equipment-check-cell equipment-taken-cell"
                        >
                          {isMe ? (
                            <input
                              type="checkbox"
                              checked={takenChecked}
                              onChange={() => toggleTaken(item)}
                              aria-label={`${item.name} : pris par moi`}
                            />
                          ) : (
                            <span
                              className={
                                takenChecked
                                  ? "equipment-other-checked"
                                  : "equipment-other-empty"
                              }
                            >
                              {takenChecked ? "✓" : "—"}
                            </span>
                          )}
                        </td>
                      </>
                    );
                  })}

                  <td className="equipment-action-cell">
                    {canDelete && (
                      <button
                        type="button"
                        className="equipment-delete"
                        onClick={() => removeItem(item)}
                        aria-label={`Supprimer ${item.name}`}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
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

      {trip?.equipmentPreset?.listName && (
        <p className="equipment-help">
          ⭐ Modèle utilisé : {trip.equipmentPreset.listName}
        </p>
      )}

      <div className="equipment-progress">
        <strong>
          Ma préparation : {checkedCount} / {items.length} éléments pris
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

      <p className="equipment-help">
        Tout le monde peut indiquer ce qu'un participant doit prendre.
        Seul le participant concerné peut confirmer qu'il l'a pris.
      </p>

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
            <section
              className="equipment-category"
              key={section.category}
            >
              <h3>{section.category}</h3>
              {renderTable(section.items)}
            </section>
          ))}

          {extraFavoriteSections.map((section) => (
            <section
              className="equipment-category"
              key={section.category}
            >
              <h3>{section.category}</h3>
              {renderTable(section.items)}
            </section>
          ))}

          {customItems.length > 0 && (
            <section className="equipment-category">
              <h3>➕ MATÉRIEL AJOUTÉ</h3>
              {renderTable(customItems)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
