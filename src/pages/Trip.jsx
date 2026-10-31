
import { useState } from "react";
import GpxPage from "./GpxPage";
import MeetingPoint from "./MeetingPoint";

export default function Trip({
  trip,
  tripMembers = [],
  errorMessage,
  editName,
  setEditName,
  editLocation,
  setEditLocation,
  savingDetails,
  onSave,
  onCreateInvite,
  creatingInvite,
  onBack,
}) {
  const [activePage, setActivePage] = useState("home");
  const [copyStatus, setCopyStatus] = useState("");

  if (activePage === "gpx") {
    return (
      <GpxPage
        trip={trip}
        onBack={() => setActivePage("home")}
      />
    );
  }

  if (activePage === "map") {
    return (
      <MeetingPoint
        trip={trip}
        onBack={() => setActivePage("home")}
      />
    );
  }

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(trip.inviteCode);
      setCopyStatus("Code copié !");
    } catch (error) {
      setCopyStatus("Copie impossible. Sélectionne le code manuellement.");
    }
  }

  const sections = [
    {
      id: "map",
      icon: "📍",
      title: "Carte & rendez-vous",
      description: "Choisir le lieu de départ et retrouver la carte.",
    },
    {
      id: "gpx",
      icon: "🧭",
      title: "Itinéraire GPS",
      description: "Importer, consulter et partager les parcours GPX.",
    },
    {
      id: "equipment",
      icon: "🎒",
      title: "Matériel",
      description: "Préparer les affaires et répartir le matériel.",
    },
    {
      id: "availability",
      icon: "📅",
      title: "Disponibilités",
      description: "Trouver les dates qui conviennent à l'équipe.",
    },
  ];

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
            <span className="eyebrow">MODIFICATION</span>
            <h3>Modifier l'aventure</h3>

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

      <article className="trip-card" style={{ marginTop: "25px" }}>
        <div className="trip-info">
          <span className="eyebrow">INVITATION</span>
          <h3>Inviter des participants</h3>

          {trip.inviteCode ? (
            <>
              <p>Voici le code à transmettre à tes compagnons :</p>

              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "bold",
                  letterSpacing: "6px",
                  textAlign: "center",
                  padding: "15px",
                  color: "#D9B65D",
                }}
              >
                {trip.inviteCode}
              </div>

              <button
                className="primary-button full-button"
                onClick={copyInviteCode}
              >
                {copyStatus === "Code copié !"
                  ? "✓ Code copié !"
                  : "📋 Copier le code"}
              </button>

              {copyStatus && (
                <p style={{ color: "#D9B65D", marginTop: "10px" }}>
                  {copyStatus}
                </p>
              )}
            </>
          ) : trip.myRole === "owner" ? (
            <>
              <p>
                Cette ancienne aventure n'a pas encore de code enregistré.
              </p>

              <button
                className="primary-button full-button"
                onClick={onCreateInvite}
                disabled={creatingInvite}
              >
                {creatingInvite
                  ? "Création du code..."
                  : "Créer un code d'invitation →"}
              </button>
            </>
          ) : (
            <p>
              Le code d'invitation n'est pas disponible pour cette aventure.
            </p>
          )}
        </div>
      </article>

      <div style={{ marginTop: "40px" }}>
        <span className="eyebrow">ORGANISATION DE L'EXPÉDITION</span>
        <h2>Préparons l'aventure</h2>
        <p className="trip-location">
          Retrouvez ici tous les outils pour organiser votre road trip.
        </p>

        <div className="trip-grid adventure-menu">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="trip-card adventure-menu-card"
              onClick={() => {
                if (section.id === "gpx" || section.id === "map") {
                  setActivePage(section.id);
                }
              }}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div className="trip-info">
                <span className="adventure-menu-icon">
                  {section.icon}
                </span>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
                <span className="adventure-menu-link">
                  {section.id === "gpx" || section.id === "map"
                    ? "OUVRIR →"
                    : "BIENTÔT DISPONIBLE"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "40px" }}>
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
    </section>
  );
}
