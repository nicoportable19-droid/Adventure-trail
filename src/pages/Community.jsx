import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function Community({ onBack, onOpenProfile }) {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "publicProfiles"),
      (snapshot) => {
        setRiders(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setLoading(false);
      },
      (err) => {
        setError("Impossible de charger la communauté : " + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <section className="trips-section">
      <button className="text-button" onClick={onBack}>
        ← Retour à l'accueil
      </button>

      <div className="section-heading" style={{ marginTop: 25 }}>
        <div>
          <span className="eyebrow">ADVENTURE TRAIL</span>
          <h2>La communauté ({riders.length})</h2>
          <p className="trip-location">
            Découvre les riders et leurs motos.
          </p>
        </div>
      </div>

      {loading && <p>Chargement des riders...</p>}

      {error && (
        <p style={{ color: "#ff7777" }}>{error}</p>
      )}

      {!loading && riders.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏍️</div>
          <h3>La communauté arrive !</h3>
          <p>
            Aucun profil public pour le moment.
            Enregistre ton profil pour apparaître ici.
          </p>
        </div>
      )}

      <div className="trip-grid">
        {riders.map((rider) => (
          <button
            type="button"
            className="trip-card"
            key={rider.id}
            onClick={() => onOpenProfile(rider.id)}
            style={{
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div className="trip-info">
              {rider.photoURL ? (
                <img
                  src={rider.photoURL}
                  alt=""
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div style={{ fontSize: 38 }}>👤</div>
              )}

              <h3>{rider.pseudo || "Rider"}</h3>

              <p>
                {(rider.riding || []).join(" · ") ||
                  "Pratique non renseignée"}
              </p>

              <p>
                {(rider.bikes || [])
                  .map((bike) =>
                    [
                      bike.make,
                      bike.model,
                      bike.capacity
                        ? bike.capacity + " cm³"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  )
                  .filter(Boolean)
                  .join(" · ") || "Motos non renseignées"}
              </p>

              <p>
                {[rider.region, rider.country]
                  .filter(Boolean)
                  .join(" · ") || "Région non renseignée"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}