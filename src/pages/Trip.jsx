import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import MeetingPointMap from "../components/MeetingPointMap";

const MAX_GPX_SIZE = 700 * 1024;

function parseGPX(content) {
  const xml = new DOMParser().parseFromString(
    content,
    "application/xml"
  );

  if (xml.querySelector("parsererror")) {
    throw new Error("Le fichier GPX est invalide.");
  }

  const points = Array.from(
    xml.querySelectorAll("trkpt, rtept, wpt")
  )
    .map((point) => [
      Number(point.getAttribute("lat")),
      Number(point.getAttribute("lon")),
    ])
    .filter(
      ([lat, lng]) =>
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
    );

  if (points.length < 2) {
    throw new Error("Aucun parcours GPS exploitable trouvé.");
  }

  return points;
}

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
  onBack,
}) {
  const [meetingPoint, setMeetingPoint] = useState(
    trip.meetingPoint || null
  );
  const [address, setAddress] = useState("");
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [savingPoint, setSavingPoint] = useState(false);
  const [mapMessage, setMapMessage] = useState("");

  const [gpxTrack, setGpxTrack] = useState(
    trip.gpxTrack || []
  );
  const [gpxContent, setGpxContent] = useState(
    trip.gpxContent || ""
  );
  const [gpxFileName, setGpxFileName] = useState(
    trip.gpxFileName || ""
  );
  const [savingGPX, setSavingGPX] = useState(false);

  useEffect(() => {
    setMeetingPoint(trip.meetingPoint || null);
    setGpxTrack(trip.gpxTrack || []);
    setGpxContent(trip.gpxContent || "");
    setGpxFileName(trip.gpxFileName || "");
  }, [trip.id]);

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
  }

  async function searchAddress(e) {
    e.preventDefault();

    if (!address.trim() || searchingAddress) return;

    setSearchingAddress(true);
    setMapMessage("");

    try {
      const cacheKey =
        "adventure-trail-address-" + address.trim().toLowerCase();

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
          throw new Error(
            "Adresse introuvable. Essaie avec une ville ou un code postal."
          );
        }

        result = {
          lat: Number(results[0].lat),
          lng: Number(results[0].lon),
        };

        localStorage.setItem(cacheKey, JSON.stringify(result));
      }

      setMeetingPoint(result);
      setMapMessage(
        "Adresse trouvée ! Pense à enregistrer le point."
      );
    } catch (error) {
      setMapMessage(error.message);
    } finally {
      setSearchingAddress(false);
    }
  }

  async function importGPX(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMapMessage("");

    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setMapMessage("Choisis un fichier avec l'extension .gpx.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_GPX_SIZE) {
      setMapMessage("Fichier trop volumineux : maximum 700 Ko.");
      event.target.value = "";
      return;
    }

    try {
      const content = await file.text();
      const points = parseGPX(content);

      setGpxContent(content);
      setGpxTrack(points);
      setGpxFileName(file.name);

      setMapMessage(
        "Parcours importé ! Pense à enregistrer le tracé."
      );
    } catch (error) {
      setMapMessage(error.message);
    }

    event.target.value = "";
  }

  async function saveGPX() {
    if (!gpxContent || savingGPX) return;

    setSavingGPX(true);
    setMapMessage("");

    try {
      await updateDoc(doc(db, "trips", trip.id), {
        gpxContent,
        gpxTrack,
        gpxFileName,
        updatedAt: serverTimestamp(),
      });

      setMapMessage("Parcours GPX enregistré et partagé !");
    } catch (error) {
      console.error(error);
      setMapMessage("Erreur lors de l'enregistrement : " + error.message);
    } finally {
      setSavingGPX(false);
    }
  }

  function downloadGPX() {
    if (!gpxContent) return;

    const blob = new Blob([gpxContent], {
      type: "application/gpx+xml",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = gpxFileName || "adventure-trail.gpx";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
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
                {savingDetails
                  ? "Enregistrement..."
                  : "Enregistrer les modifications →"}
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
            <form
              onSubmit={searchAddress}
              style={{ marginBottom: "15px" }}
            >
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
                {searchingAddress
                  ? "Recherche..."
                  : "Rechercher l'adresse"}
              </button>
            </form>

            <MeetingPointMap
              meetingPoint={meetingPoint}
              onSelect={(point) => {
                setMeetingPoint(point);
                setMapMessage("");
              }}
              gpxTrack={gpxTrack}
            />

            <button
              className="primary-button full-button"
              onClick={saveMeetingPoint}
              disabled={!meetingPoint || savingPoint}
              style={{ marginTop: "15px" }}
            >
              {savingPoint
                ? "Enregistrement..."
                : "Enregistrer le point de rendez-vous →"}
            </button>

            {mapMessage && (
              <p style={{ color: "#ff8a35" }}>{mapMessage}</p>
            )}
          </div>
        </article>
      </div>

      <div style={{ marginTop: "35px" }}>
        <span className="eyebrow">ITINÉRAIRE GPS</span>
        <h2>Le parcours de l'expédition</h2>

        <article className="trip-card">
          <div className="trip-info">
            <h3>Importer un fichier GPX</h3>

            <p>
              Sélectionne un fichier GPX depuis ton téléphone.
              Le tracé apparaîtra sur la carte.
            </p>

            <label>Choisir un fichier GPX</label>
            <input
              type="file"
              accept=".gpx,application/gpx+xml,application/xml,text/xml"
              onChange={importGPX}
            />

            {gpxFileName && (
              <p style={{ marginTop: "12px" }}>
                <strong>Fichier :</strong> {gpxFileName}
              </p>
            )}

            {gpxTrack.length > 0 && (
              <p style={{ color: "#ff8a35" }}>
                {gpxTrack.length} points GPS chargés.
              </p>
            )}

            <button
              className="primary-button full-button"
              onClick={saveGPX}
              disabled={!gpxContent || savingGPX}
              style={{ marginTop: "15px" }}
            >
              {savingGPX
                ? "Enregistrement..."
                : "Enregistrer et partager le parcours →"}
            </button>

            <button
              className="primary-button full-button"
              onClick={downloadGPX}
              disabled={!gpxContent}
              style={{ marginTop: "10px" }}
            >
              Télécharger le fichier GPX ↓
            </button>
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
        <span className="eyebrow">PRÉPARATION</span>
        <h2>Préparation du road trip</h2>

        <div className="trip-grid">
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