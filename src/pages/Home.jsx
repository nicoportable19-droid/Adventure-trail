export default function Home({
  trips = [],
  firebaseStatus = "Connexion...",
  errorMessage = "",
  onCreate = () => {},
  onOpenTrip = () => {},
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

          <button className="primary-button" onClick={onCreate}>
            <span>＋</span> Créer un road trip
          </button>
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

        <p style={{ color: "#ff8a35", fontSize: "13px" }}>
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
              Créez votre premier road trip et invitez vos compagnons.
            </p>
            <button className="primary-button" onClick={onCreate}>
              Créer mon premier road trip
            </button>
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
                    <span>◷ {trip.dates || "Dates à définir"}</span>
                    <span>
                      ♟ {trip.participants || 1} participant(s)
                    </span>
                  </div>

                  <p style={{ color: "#ff8a35", fontSize: "12px" }}>
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
    </>
  );
}
