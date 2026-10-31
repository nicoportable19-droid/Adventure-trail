
export default function Trip({
  trip,
  tripMembers,
  errorMessage,
  editName,
  setEditName,
  editLocation,
  setEditLocation,
  savingDetails,
  onSave,
  onBack,
}) {
  return (
    <section className="trips-section">
      <button className="text-button" onClick={onBack}>
        ← Retour à mes aventures
      </button>

      <div className="section-heading" style={{ marginTop: "25px" }}>
        <div>
          <span className="eyebrow">VOTRE EXPÉDITION</span>
          <h2>{trip.name}</h2>
          <p className="trip-location">{trip.location}</p>
        </div>
        <span className="trip-status">
          {trip.status || "Préparation"}
        </span>
      </div>

      {errorMessage && (
        <p style={{ color: "#ff5555" }}>{errorMessage}</p>
      )}

      <div className="trip-grid">
        <article className="trip-card">
          <div className="trip-art">
            <span className="trip-emoji">🏍️</span>
            <span className="trip-number">ADVENTURE TRAIL</span>
          </div>

          <div className="trip-info">
            <span className="eyebrow">INFORMATIONS</span>
            <h3>Détails de l'aventure</h3>

            <p><strong>Destination :</strong> {trip.location}</p>
            <p><strong>Dates :</strong> {trip.dates || "À définir"}</p>
            <p><strong>Statut :</strong> {trip.status || "Préparation"}</p>
            <p>
              <strong>Ton rôle :</strong>{" "}
              {trip.myRole === "owner" ? "Organisateur" : "Participant"}
            </p>
          </div>
        </article>

        <article className="trip-card">
          <div className="trip-info">
            <span className="eyebrow">MODIFICATION COLLABORATIVE</span>
            <h3>Modifier l'aventure</h3>
            <p>
              Tous les participants peuvent modifier ces informations.
            </p>

            <form onSubmit={onSave}>
              <label>Nom de l'aventure</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nom du road trip"
                required
              />

              <label>Destination</label>
              <input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Destination"
              />

              <button
                className="primary-button full-button"
                type="submit"
                disabled={savingDetails}
              >
                {savingDetails
                  ? "Enregistrement..."
                  : "Enregistrer les modifications →"}
              </button>
            </form>
          </div>
        </article>
      </div>

      <div style={{ marginTop: "35px" }}>
        <span className="eyebrow">L'ÉQUIPE</span>
        <h2>Participants ({tripMembers.length})</h2>

        {tripMembers.length === 0 ? (
          <p>Chargement des participants...</p>
        ) : (
          <div className="trip-grid">
            {tripMembers.map((member) => (
              <article className="trip-card" key={member.id}>
                <div className="trip-info">
                  <h3>👤 {member.firstName || "Rider"}</h3>
                  <p className="trip-location">
                    {member.role === "owner"
                      ? "Organisateur"
                      : "Participant"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: "35px" }}>
        <span className="eyebrow">BIENTÔT DISPONIBLE</span>
        <h2>Préparation du road trip</h2>

        <div className="trip-grid">
          <article className="trip-card">
            <div className="trip-info">
              <h3>🗺️ Itinéraire GPS</h3>
              <p>Carte et import de fichiers GPX.</p>
            </div>
          </article>

          <article className="trip-card">
            <div className="trip-info">
              <h3>📍 Point de rendez-vous</h3>
              <p>Définition du lieu de départ.</p>
            </div>
          </article>

          <article className="trip-card">
            <div className="trip-info">
              <h3>☑️ Liste de matériel</h3>
              <p>Préparation collaborative des affaires.</p>
            </div>
          </article>

          <article className="trip-card">
            <div className="trip-info">
              <h3>📅 Disponibilités</h3>
              <p>Choix des dates avec les participants.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
