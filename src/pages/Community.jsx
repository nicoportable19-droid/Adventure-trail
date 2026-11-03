
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

export default function Community({ onBack, onOpenProfile }) {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const profilesQuery = query(
      collection(db, "publicProfiles")
    );

    const unsubscribe = onSnapshot(
      profilesQuery,
      (snapshot) => {
        setRiders(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Chargement communauté :", err);
        setError(
          "Impossible de charger la communauté : " + err.message
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <main className="trips-section community-page">
      <button
        type="button"
        className="text-button"
        onClick={onBack}
      >
        ← Retour
      </button>

      <div className="section-heading" style={{ marginTop: "25px" }}>
        <div>
          <span className="eyebrow">ADVENTURE TRAIL</span>
          <h2>La communauté</h2>
          <p className="trip-location">
            Découvrez les riders et leurs aventures.
          </p>
        </div>

        <span className="trip-status">
          {riders.length} rider(s)
        </span>
      </div>

      {error && (
        <p style={{ color: "#ff7777" }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="empty-state">
          <p>Chargement des riders...</p>
        </div>
      ) : riders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏍️</div>
          <h3>La communauté démarre</h3>
          <p>
            Aucun profil public n'est disponible pour le moment.
            Enregistre ton profil pour apparaître ici.
          </p>
        </div>
      ) : (
        <div className="trip-grid">
          {riders.map((rider) => (
            <article
              className="trip-card community-card"
              key={rider.id}
            >
              <div className="trip-art">
                {rider.photoURL ? (
                  <img
                    src={rider.photoURL}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span className="trip-emoji">👤</span>
                )}

                <span className="trip-status">
                  RIDER
                </span>
              </div>

              <div className="trip-info">
                <h3>
                  {rider.pseudo || "Rider"}
                </h3>

                <p className="trip-location">
                  {[rider.region, rider.country]
                    .filter(Boolean)
                    .join(" · ") || "Région non renseignée"}
                </p>

                <p className="profile-muted">
                  {Array.isArray(rider.riding) &&
                  rider.riding.length > 0
                    ? rider.riding.join(" · ")
                    : "Pratique non renseignée"}
                </p>

                <p className="profile-muted">
                  {Array.isArray(rider.bikes)
                    ? rider.bikes
                        .map((bike) =>
                          [bike.make, bike.model]
                            .filter(Boolean)
                            .join(" ")
                        )
                        .filter(Boolean)
                        .join(" · ") || "Aucune moto renseignée"
                    : "Aucune moto renseignée"}
                </p>

                <button
                  type="button"
                  className="trip-link"
                  onClick={() => onOpenProfile(rider.id)}
                >
                  Voir le profil <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <style>{`
        .community-page .community-card {
          min-width: 0;
        }

        .community-page .trip-art {
          overflow: hidden;
        }

        .community-page .trip-art img {
          display: block;
        }

        .community-page .profile-muted {
          color: #999;
          font-size: 13px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }
      `}</style>
    </main>
  );
}
