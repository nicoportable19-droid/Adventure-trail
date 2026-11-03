```jsx
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function PublicProfile({ userId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "publicProfiles", userId),
      (snapshot) => {
        setProfile(
          snapshot.exists() ? snapshot.data() : null
        );
        setLoading(false);
      },
      (err) => {
        setError(
          "Impossible de charger ce profil : " + err.message
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return (
    <section className="trips-section">
      <button className="text-button" onClick={onBack}>
        ← Retour
      </button>

      {loading && <p>Chargement du profil...</p>}

      {error && (
        <p style={{ color: "#ff7777" }}>{error}</p>
      )}

      {!loading && !error && !profile && (
        <p>Ce profil public n'existe pas.</p>
      )}

      {!loading && !error && profile && (
        <>
          <div
            className="section-heading"
            style={{ marginTop: 25 }}
          >
            <div>
              <span className="eyebrow">PROFIL RIDER</span>
              <h2>{profile.pseudo || "Rider"}</h2>

              <p className="trip-location">
                {[profile.region, profile.country]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            {profile.photoURL && (
              <img
                src={profile.photoURL}
                alt="Photo de profil"
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            )}
          </div>

          <div className="trip-grid">
            <article className="trip-card">
              <div className="trip-info">
                <span className="eyebrow">PRATIQUE</span>
                <h3>Style de conduite</h3>

                <p>
                  {(profile.riding || []).join(" · ") ||
                    "Non renseigné"}
                </p>
              </div>
            </article>

            <article className="trip-card">
              <div className="trip-info">
                <span className="eyebrow">GARAGE</span>
                <h3>Ses motos</h3>

                {(profile.bikes || []).length > 0 ? (
                  profile.bikes.map((bike, index) => (
                    <p key={index}>
                      {[
                        bike.make,
                        bike.model,
                        bike.capacity
                          ? bike.capacity + " cm³"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  ))
                ) : (
                  <p>Non renseigné</p>
                )}
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
```
