export default function Home({
trips = [],
participantCounts = {},
firebaseStatus = "Connexion...",
errorMessage = "",
onCreate = () => {},
onJoin = () => {},
onOpenTrip = () => {},
onOpenCommunity = () => {},
onDeleteTrip = () => {},
}) {
return (
<>
<section className="hero">
<div className="hero-content">
<span className="eyebrow">
L'AVENTURE COMMENCE ICI
</span>

      <h1>
        LA ROUTE
        <br />
        <span>EST À VOUS.</span>
      </h1>

      <p>
        Organisez vos road trips moto, partagez vos itinéraires
        et préparez vos aventures ensemble.
      </p>

      <div className="home-actions">
        <button className="primary-button" onClick={onCreate}>
          <span>＋</span> Créer un road trip
        </button>

        <button className="outline-button" onClick={onJoin}>
          Rejoindre avec un code →
        </button>
      </div>
    </div>

    <div className="hero-stamp">
      <span>BUILT FOR</span>
      <strong>ADVENTURE</strong>
      <span>NO ROAD · NO LIMIT</span>
    </div>
  </section>

  <section className="trips-section">
    <div className="section-heading">
      <div>
        <span className="eyebrow">
          VOTRE GARAGE À AVENTURES
        </span>

        <h2>
          Mes road trips <span>({trips.length})</span>
        </h2>
      </div>

      <button className="text-button" onClick={onCreate}>
        + Nouvelle aventure
      </button>
    </div>

    <p style={{ color: "#D9B65D", fontSize: "13px" }}>
      {firebaseStatus}
    </p>

    {errorMessage && (
      <p style={{ color: "#ff5555" }}>{errorMessage}</p>
    )}

    {trips.length === 0 ? (
      <div className="empty-state">
        <div className="empty-icon">🏍️</div>

        <h3>Prêt à prendre la route ?</h3>

        <p>
          Crée ton premier road trip ou rejoins une aventure
          avec le code transmis par un organisateur.
        </p>

        <div className="home-actions home-actions-centered">
          <button className="primary-button" onClick={onCreate}>
            Créer mon premier road trip
          </button>

          <button className="outline-button" onClick={onJoin}>
            Rejoindre avec un code →
          </button>
        </div>
      </div>
    ) : (
      <div className="trip-grid">
        {trips.map((trip) => (
          <article
            className="trip-card"
            key={trip.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenTrip(trip)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenTrip(trip);
              }
            }}
            style={{
              cursor: "pointer",
              transition: "transform 0.2s ease, border-color 0.2s ease",
            }}
            aria-label={`Ouvrir l'aventure ${trip.name}`}
          >
            <div className="trip-art">
              <span className="trip-emoji">
                {trip.icon || "🏍️"}
              </span>

              <span className="trip-status">
                {trip.status || "Préparation"}
              </span>

              <span className="trip-number">
                AT / {String(trip.id).slice(-3)}
              </span>
            </div>

            <div className="trip-info">
              <span className="trip-location">
                {trip.location}
              </span>

              <h3>{trip.name}</h3>

              <div className="trip-meta">
                <span>
                  ◷ {trip.dates || "Dates à définir"}
                </span>

                <span>
                  ♟ {participantCounts[trip.id] ?? "…"}
                  {" "}participant(s)
                </span>
              </div>

              <p style={{ color: "#D9B65D", fontSize: "12px" }}>
                {trip.myRole === "owner"
                  ? "Organisateur"
                  : "Participant"}
              </p>

              {trip.myRole === "owner" && (
                <button
                  type="button"
                  className="delete-trip-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteTrip(trip);
                  }}
                >
                  🗑️ Supprimer l'aventure
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    )}
  </section>

  <section className="trips-section community-home">
    <div className="section-heading">
      <div>
        <span className="eyebrow">
          RENCONTREZ LES RIDERS
        </span>

        <h2>
          La communauté <span>🏍️</span>
        </h2>
      </div>
    </div>

    <div className="empty-state">
      <div className="empty-icon">🤝</div>

      <h3>Rouler ensemble</h3>

      <p>
        Découvrez les profils des riders, leurs motos
        et leurs aventures.
      </p>

      <button
        className="primary-button"
        onClick={onOpenCommunity}
      >
        Découvrir la communauté →
      </button>
    </div>
  </section>

  <style>{`
    .home-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-top: 24px;
    }

    .home-actions-centered {
      justify-content: center;
    }

    .home-actions button {
      min-height: 46px;
    }

    .community-home {
      margin-top: 45px;
    }

    .trip-card[role="button"]:hover {
      transform: translateY(-4px);
      border-color: #D9B65D;
    }

    .trip-card[role="button"]:focus-visible {
      outline: 2px solid #D9B65D;
      outline-offset: 3px;
    }

    .delete-trip-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 40px;
      margin-top: 12px;
      padding: 9px 14px;
      border: 1px solid rgba(220, 80, 80, 0.5);
      border-radius: 9px;
      color: #ff8585;
      background: rgba(180, 45, 45, 0.10);
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .delete-trip-button:hover {
      border-color: #e45b5b;
      color: #fff;
      background: rgba(180, 45, 45, 0.25);
    }

    .delete-trip-button:focus-visible {
      outline: 2px solid #e45b5b;
      outline-offset: 3px;
    }

    @media (max-width: 520px) {
      .home-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .home-actions button {
        width: 100%;
      }

      .delete-trip-button {
        width: 100%;
      }
    }
  `}</style>
</>

);
}