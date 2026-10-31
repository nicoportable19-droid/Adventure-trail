import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import MeetingPointMap from "../components/MeetingPointMap";

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
  const [meetingPoint, setMeetingPoint] = useState(
    trip.meetingPoint || null
  );
const [address, setAddress] = useState("");
const [searchingAddress, setSearchingAddress] = useState(false);
  const [savingPoint, setSavingPoint] = useState(false);
  const [mapMessage, setMapMessage] = useState("");

  useEffect(() => {
    setMeetingPoint(trip.meetingPoint || null);
  }, [trip.id, trip.meetingPoint]);

  async function saveMeetingPoint() {
    if (!meetingPoint || savingPoint) return;

    setSavingPoint(true);
    setMapMessage("");

    try {
      await updateDoc(doc(db, "trips", trip.id), {
        meetingPoint,
        updatedAt: serverTimestamp(),
      });

      setMapMessage("Point de rendez-vous enregistré !");
    } catch (error) {
      console.error(error);
      setMapMessage("Erreur : " + error.message);
    } finally {
      setSavingPoint(false);
    }

async function searchAddress(e) {
  e.preventDefault();

  if (!address.trim() || searchingAddress) return;

  setSearchingAddress(true);
  setMapMessage("");

  try {
    const cacheKey = "adventure-trail-address-" + address.trim().toLowerCase();
    const cached = localStorage.getItem(cacheKey);

    let result;

    if (cached) {
      result = JSON.parse(cached);
    } else {
      const params = new URLSearchParams({
        q: address.trim(),
        format: "jsonv2",
        limit: "1",
      });

      const response = await fetch(
        "https://nominatim.openstreetmap.org/search?" + params
      );

      if (!response.ok) {
        throw new Error("Service de recherche indisponible.");
      }

      const results = await response.json();

      if (!results.length) {
        throw new Error("Adresse introuvable. Essaie avec une ville ou un code postal.");
      }

      result = {
        lat: Number(results[0].lat),
        lng: Number(results[0].lon),
      };

      localStorage.setItem(cacheKey, JSON.stringify(result));
    }

    setMeetingPoint(result);
    setMapMessage("Adresse trouvée ! Pense à enregistrer le point.");
  } catch (error) {
    setMapMessage(error.message);
  } finally {
    setSearchingAddress(false);
  }
}

  }

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
                {savingDetails ? "Enregistrement..." : "Enregistrer les modifications →"}
              </button>
            </form>
          </div>
        </article>
      </div>

      <div style={{ marginTop: "35px" }}>
        <span className="eyebrow">POINT DE RENDEZ-VOUS</span>
        <h2>Où commence l'aventure ?</h2>

        <article className="trip-card">
          <div className="trip-info">

<form onSubmit={searchAddress} style={{ marginBottom: "15px" }}>
  <label>Rechercher une adresse</label>

  <input
    value={address}
    onChange={(e) => setAddress(e.target.value)}
    placeholder="Ex. : Place Bellecour, Lyon"
  />

  <button
    className="primary-button full-button"
    type="submit"
    disabled={searchingAddress || !address.trim()}
    style={{ marginTop: "10px" }}
  >
    {searchingAddress ? "Recherche..." : "Rechercher l'adresse"}
  </button>
</form>

            <MeetingPointMap
              meetingPoint={meetingPoint}
              onSelect={(point) => {
                setMeetingPoint(point);
                setMapMessage("");
              }}
            />

            <button
              className="primary-button full-button"
              onClick={saveMeetingPoint}
              disabled={!meetingPoint || savingPoint}
              style={{ marginTop: "15px" }}
            >
              {savingPoint ? "Enregistrement..." : "Enregistrer le point de rendez-vous →"}
            </button>

            {mapMessage && (
              <p style={{ color: "#ff8a35" }}>{mapMessage}</p>
            )}
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
                    {member.role === "owner" ? "Organisateur" : "Participant"}
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
              <p>Import et affichage de fichiers GPX.</p>
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
