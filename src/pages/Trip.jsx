
import { useState } from "react";
import GpxPage from "./GpxPage";
import MeetingPoint from "./MeetingPoint";
import EquipmentPage from "./EquipmentPage";
import CalendarPage from "./CalendarPage";

export default function Trip({
  trip,
  tripMembers = [],
  userId,
  errorMessage,
  editName,
  setEditName,
  editLocation,
  setEditLocation,
  savingDetails,
  onSave,
  onCreateInvite,
  creatingInvite,
  onOpenProfile = () => {},
  onBack,
}) {
  const [activePage, setActivePage] = useState("home");
  const [copyStatus, setCopyStatus] = useState("");
  const [isEditingDetails, setIsEditingDetails] = useState(false);

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
        tripMembers={tripMembers}
        userId={userId}
        onBack={() => setActivePage("home")}
      />
    );
  }

  if (activePage === "equipment") {
    return (
      <EquipmentPage
        trip={trip}
        tripMembers={tripMembers}
        onBack={() => setActivePage("home")}
      />
    );
  }

  if (activePage === "availability") {
    return (
      <CalendarPage
        trip={trip}
        tripMembers={tripMembers}
        onBack={() => setActivePage("home")}
      />
    );
  }

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(trip.inviteCode);
      setCopyStatus("Code copié !");
    } catch (error) {
      setCopyStatus(
        "Copie impossible. Sélectionne le code manuellement."
      );
    }
  }

  function cancelDetailsEdit() {
    setEditName(trip.name || "");
    setEditLocation(trip.location || "");
    setIsEditingDetails(false);
  }

  async function saveDetails(event) {
    await onSave(event);
    setIsEditingDetails(false);
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

      {/* DÉTAILS DE L'AVENTURE */}
      <div className="trip-grid">
        <article className="trip-card">
          <div className="trip-info">
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <span className="eyebrow">INFORMATIONS</span>
                <h3>Détails de l'aventure</h3>
              </div>

              {trip.myRole === "owner" &&
                !isEditingDetails && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDetails(true)}
                    aria-label="Modifier les détails de l'aventure"
                    title="Modifier les détails"
                    style={{
                      border: "1px solid rgba(217, 182, 93, 0.45)",
                      background: "rgba(217, 182, 93, 0.12)",
                      color: "#D9B65D",
                      borderRadius: "10px",
                      width: "38px",
                      height: "38px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "19px",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    ✏️
                  </button>
                )}
            </div>

            {isEditingDetails ? (
              <form onSubmit={saveDetails}>
                <label>Nom de l'aventure</label>

                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Nom du road trip"
                  required
                />

                <label>Destination</label>

                <input
                  value={editLocation}
                  onChange={(event) => setEditLocation(event.target.value)}
                  placeholder="Destination"
                />

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginTop: "16px",
                  }}
                >
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={savingDetails}
                  >
                    {savingDetails ? "Enregistrement..." : "Enregistrer"}
                  </button>

                  <button
                    className="text-button"
                    type="button"
                    onClick={cancelDetailsEdit}
                    disabled={savingDetails}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>
                  <strong>Destination :</strong>{" "}
                  {trip.location || "À définir"}
                </p>

                <p>
                  <strong>Dates :</strong>{" "}
                  {trip.dates || "À définir"}
                </p>

                <p>
                  <strong>Statut :</strong>{" "}
                  {trip.status || "Préparation"}
                </p>

                <p>
                  <strong>Ton rôle :</strong>{" "}
                  {trip.myRole === "owner" ? "Organisateur" : "Participant"}
                </p>
              </>
            )}
          </div>
        </article>
      </div>

      {/* ÉQUIPE ET CODE DE PARTAGE */}
      <article className="trip-card" style={{ marginTop: "25px" }}>
        <div className="trip-info">
          <span className="eyebrow">L'ÉQUIPE</span>
          <h3>Participants et partage</h3>

          {trip.inviteCode ? (
            <>
              <p>Invite tes compagnons avec ce code :</p>

              <button
                className="primary-button full-button"
                onClick={copyInviteCode}
              >
                {copyStatus === "Code copié !"
                  ? "✓ Code copié !"
                  : `📋 Copier le code : ${trip.inviteCode}`}
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
                Aucun code de partage n'est encore créé pour cette aventure.
              </p>

              <button
                className="primary-button full-button"
                onClick={onCreateInvite}
                disabled={creatingInvite}
              >
                {creatingInvite
                  ? "Création du code..."
                  : "Créer un code de partage →"}
              </button>
            </>
          ) : (
            <p>
              Le code de partage n'est pas disponible pour cette aventure.
            </p>
          )}

          <div
            style={{
              marginTop: "25px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(217, 182, 93, 0.2)",
            }}
          >
            <h3 style={{ marginBottom: "15px" }}>
              Membres ({tripMembers.length})
            </h3>

            {tripMembers.length === 0 ? (
              <p>Chargement des participants...</p>
            ) : (
              <div className="trip-grid">
                {tripMembers.map((member) => (
                  <button
                    type="button"
                    className="trip-card"
                    key={member.id}
                    onClick={() => onOpenProfile(member.uid || member.id)}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <div className="trip-info">
                      <h3>👤 {member.firstName || "Rider"}</h3>

                      <p className="trip-location">
                        {member.role === "owner"
                          ? "Organisateur"
                          : "Participant"}
                      </p>

                      <span className="adventure-menu-link">
                        Voir le profil →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* ORGANISATION DE L'EXPÉDITION */}
      <div style={{ marginTop: "40px" }}>
        <span className="eyebrow">
          ORGANISATION DE L'EXPÉDITION
        </span>

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
              onClick={() => setActivePage(section.id)}
              style={{
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div className="trip-info">
                <span className="adventure-menu-icon">
                  {section.icon}
                </span>

                <h3>{section.title}</h3>
                <p>{section.description}</p>

                <span className="adventure-menu-link">
                  OUVRIR →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
