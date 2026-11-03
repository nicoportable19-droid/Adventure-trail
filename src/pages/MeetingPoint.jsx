
import { useEffect, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import MeetingPointMap from "../components/MeetingPointMap";

export default function MeetingPoint({ trip, onBack }) {
  const [meetingPoint, setMeetingPoint] = useState(
    trip.meetingPoint || null
  );
  const [address, setAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMeetingPoint(trip.meetingPoint || null);
  }, [trip.id, trip.meetingPoint]);

  async function searchAddress(event) {
    event.preventDefault();

    if (!address.trim() || searching) return;

    setSearching(true);
    setMessage("");

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
      setMessage("Adresse trouvée ! Pense à enregistrer le point.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSearching(false);
    }
  }

  async function saveMeetingPoint() {
    if (!meetingPoint || saving) return;

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "trips", trip.id), {
        meetingPoint,
        updatedAt: serverTimestamp(),
      });

      setMessage("Point de rendez-vous enregistré !");
    } catch (error) {
      console.error(error);
      setMessage("Erreur : " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="trips-section">
      <button className="text-button" onClick={onBack}>
        ← Retour à l'aventure
      </button>

      <div className="section-heading" style={{ marginTop: "25px" }}>
        <div>
          <span className="eyebrow">ADVENTURE TRAIL · CARTE</span>
          <h2>Carte & rendez-vous</h2>
          <p className="trip-location">{trip.name}</p>
        </div>
      </div>

      <article className="trip-card">
        <div className="trip-info">
          <h3>📍 Où commence l'aventure ?</h3>

          <form onSubmit={searchAddress} style={{ marginBottom: "20px" }}>
            <label>Rechercher une adresse ou une ville</label>

            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Ex. : Place Bellecour, Lyon"
            />

            <button
              className="primary-button full-button"
              type="submit"
              disabled={searching || !address.trim()}
              style={{ marginTop: "10px" }}
            >
              {searching ? "Recherche..." : "Rechercher l'adresse"}
            </button>
          </form>

          <MeetingPointMap
            meetingPoint={meetingPoint}
            onSelect={(point) => {
              setMeetingPoint(point);
              setMessage("Position sélectionnée. Pense à l'enregistrer.");
            }}
            gpxTracks={(trip.gpxRoutes || [])
              .map((route) => route.track || [])
              .filter((track) => track.length > 1)}
            gpxTrack={trip.gpxTrack || []}
          />

          <button
            className="primary-button full-button"
            onClick={saveMeetingPoint}
            disabled={!meetingPoint || saving}
            style={{ marginTop: "15px" }}
          >
            {saving
              ? "Enregistrement..."
              : "Enregistrer le point de rendez-vous →"}
          </button>

          {message && (
            <p style={{ color: "#D9B65D", marginTop: "15px" }}>
              {message}
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
