export default function Home({
  trips = [],
  participantCounts = {},
  firebaseStatus = "Connexion...",
  errorMessage = "",
  onCreate = () => {},
  onJoin = () => {},
  onOpenTrip = () => {},
  onOpenCommunity = () => {},
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
              <article className="trip-card" key={trip.id}>
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

                  <button
                    className="trip-link"
                    onClick={() => onOpenTrip(trip)}
                  >
                    Ouvrir l'aventure <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* COMMUNAUTÉ */}
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

        @media (max-width: 520px) {
          .home-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .home-actions button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
