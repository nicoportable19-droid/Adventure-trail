
import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

export default function PublicProfile({
  userId,
  onBack,
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const profileRef = doc(
      db,
      "publicProfiles",
      userId
    );

    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data());
        } else {
          setProfile(null);
        }

        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("Chargement profil public :", err);
        setError(
          "Impossible de charger ce profil : " + err.message
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return (
      <main className="trips-section">
        <p>Chargement du profil...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="trips-section">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Retour
        </button>

        <p style={{ color: "#ff7777" }}>
          {error}
        </p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="trips-section">
        <button
          type="button"
          className="text-button"
          onClick={onBack}
        >
          ← Retour
        </button>

        <div className="empty-state">
          <h3>Profil indisponible</h3>
          <p>
            Ce rider n'a pas encore enregistré de profil public.
          </p>
        </div>
      </main>
    );
  }

  const bikes = Array.isArray(profile.bikes)
    ? profile.bikes
    : [];

  const riding = Array.isArray(profile.riding)
    ? profile.riding
    : [];

  return (
    <main className="trips-section public-profile-page">
      <button
        type="button"
        className="text-button"
        onClick={onBack}
      >
        ← Retour à la communauté
      </button>

      <div className="profile-heading">
        <div>
          <span className="eyebrow">
            PROFIL RIDER
          </span>

          <h2>
            {profile.pseudo || "Rider"}
          </h2>

          <p className="profile-subtitle">
            {[profile.region, profile.country]
              .filter(Boolean)
              .join(" · ") || "Région non renseignée"}
          </p>
        </div>

        <span className="trip-status">
          RIDER
        </span>
      </div>

      <section className="profile-card">
        <div className="profile-identity">
          {profile.photoURL ? (
            <img
              className="profile-avatar"
              src={profile.photoURL}
              alt="Photo de profil"
            />
          ) : (
            <div className="profile-avatar profile-avatar-placeholder">
              👤
            </div>
          )}

          <div>
            <span className="eyebrow">
              IDENTITÉ
            </span>

            <h3>
              {profile.pseudo || "Rider"}
            </h3>

            <p className="profile-muted">
              {[profile.region, profile.country]
                .filter(Boolean)
                .join(" · ") || "Région non renseignée"}
            </p>
          </div>
        </div>
      </section>

      <section className="profile-card profile-section">
        <span className="eyebrow">
          PRATIQUE
        </span>

        <h3>Son style de conduite</h3>

        {riding.length === 0 ? (
          <p className="profile-muted">
            Pratique non renseignée.
          </p>
        ) : (
          <div className="public-profile-tags">
            {riding.map((item) => (
              <span
                className="trip-status"
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="profile-card profile-section">
        <span className="eyebrow">
          GARAGE
        </span>

        <h3>Ses motos</h3>

        {bikes.length === 0 ? (
          <p className="profile-muted">
            Aucune moto renseignée.
          </p>
        ) : (
          bikes.map((bike, index) => (
            <article
              className="profile-bike"
              key={index}
            >
              <h4>
                {[
                  bike.make,
                  bike.model,
                ]
                  .filter(Boolean)
                  .join(" ") || "Moto"}
              </h4>

              {bike.capacity && (
                <p className="profile-muted">
                  {bike.capacity} cm³
                </p>
              )}
            </article>
          ))
        )}
      </section>

      <style>{`
        .public-profile-page .public-profile-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .public-profile-page .profile-muted {
          color: #999;
          font-size: 13px;
          line-height: 1.6;
        }

        .public-profile-page .profile-section {
          margin-top: 20px;
        }
      `}</style>
    </main>
  );
}
