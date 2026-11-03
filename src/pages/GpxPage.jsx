import { useEffect, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import MeetingPointMap from "../components/MeetingPointMap";

const MAX_TOTAL_GPX_SIZE = 700 * 1024;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseGPX(content) {
  const xml = new DOMParser().parseFromString(content, "application/xml");

  if (xml.querySelector("parsererror")) {
    throw new Error("Un des fichiers GPX est invalide.");
  }

  const points = Array.from(xml.querySelectorAll("trkpt, rtept"))
    .map((point) => ({
      lat: Number(point.getAttribute("lat")),
      lng: Number(point.getAttribute("lon")),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        Math.abs(point.lat) <= 90 &&
        Math.abs(point.lng) <= 180
    );

  if (points.length < 2) {
    throw new Error("Un parcours ne contient pas assez de points GPS.");
  }

  return points;
}

function loadSavedRoutes(trip) {
  if (Array.isArray(trip.gpxRoutes) && trip.gpxRoutes.length) {
    return trip.gpxRoutes;
  }

  // Compatibilité avec l'ancien format : un seul GPX
  if (trip.gpxContent && Array.isArray(trip.gpxTrack)) {
    return [{
      id: "legacy-gpx",
      name: trip.gpxFileName || "Parcours GPX",
      content: trip.gpxContent,
      track: trip.gpxTrack,
    }];
  }

  return [];
}

export default function GpxPage({ trip, onBack }) {
  const [routes, setRoutes] = useState(() => loadSavedRoutes(trip));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRoutes(loadSavedRoutes(trip));
  }, [trip.id, trip.gpxRoutes, trip.gpxContent]);

  async function importGPX(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    setMessage("");

    const invalidFile = files.find(
      (file) => !file.name.toLowerCase().endsWith(".gpx")
    );

    if (invalidFile) {
      setMessage(`« ${invalidFile.name} » n'est pas un fichier GPX.`);
      return;
    }

    const currentSize = routes.reduce(
      (total, route) => total + (route.content?.length || 0),
      0
    );

    const addedSize = files.reduce(
      (total, file) => total + file.size,
      0
    );

    if (currentSize + addedSize > MAX_TOTAL_GPX_SIZE) {
      setMessage(
        "La taille totale des parcours ne doit pas dépasser 700 Ko."
      );
      return;
    }

    try {
      const importedRoutes = await Promise.all(
        files.map(async (file) => {
          const content = await file.text();

          return {
            id: createId(),
            name: file.name,
            content,
            track: parseGPX(content),
          };
        })
      );

      setRoutes((current) => [...current, ...importedRoutes]);

      setMessage(
        `${importedRoutes.length} parcours importé(s). Pense à enregistrer.`
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  function removeRoute(routeId) {
    setRoutes((current) =>
      current.filter((route) => route.id !== routeId)
    );
    setMessage("Parcours retiré. Pense à enregistrer les modifications.");
  }

  async function saveGPX() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const firstRoute = routes[0];

      await updateDoc(doc(db, "trips", trip.id), {
        gpxRoutes: routes,
        // On conserve aussi les anciens champs pour compatibilité.
        gpxContent: firstRoute?.content || "",
        gpxTrack: firstRoute?.track || [],
        gpxFileName: firstRoute?.name || "",
        updatedAt: serverTimestamp(),
      });

      setMessage("Tous les parcours ont été enregistrés et partagés !");
    } catch (error) {
      console.error(error);
      setMessage("Erreur lors de l'enregistrement : " + error.message);
    } finally {
      setSaving(false);
    }
  }

  function downloadRoute(route) {
    const blob = new Blob([route.content], {
      type: "application/gpx+xml",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = route.name || "adventure-trail.gpx";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  const allTracks = routes.map((route) => route.track);
  const totalPoints = routes.reduce(
    (total, route) => total + (route.track?.length || 0),
    0
  );

  return (
    <section className="trips-section gpx-page">
      <style>{`
        .gpx-page .gpx-panel {
          padding: 25px;
          margin-top: 20px;
          border: 1px solid rgba(217,182,93,.2);
          border-radius: 15px;
          background: #191a17;
        }

        .gpx-page .gpx-upload {
          display: block;
          margin-top: 18px;
          padding: 22px;
          border: 1px dashed rgba(217,182,93,.5);
          border-radius: 12px;
          background: rgba(217,182,93,.045);
        }

        .gpx-page .gpx-upload input {
          display: block;
          max-width: 100%;
          margin-top: 14px;
          color: #ddd5c2;
        }

        .gpx-page .gpx-route {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          padding: 15px;
          margin-top: 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 10px;
          background: #22231e;
        }

        .gpx-page .gpx-route-name {
          min-width: 0;
          overflow-wrap: anywhere;
          color: #eee9dc;
          font-weight: 600;
        }

        .gpx-page .gpx-route-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .gpx-page .gpx-route-actions button {
          padding: 8px 12px;
          border: 1px solid rgba(217,182,93,.3);
          border-radius: 7px;
          background: transparent;
          color: #e8cc82;
          cursor: pointer;
        }

        .gpx-page .gpx-summary {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin: 18px 0;
        }

        .gpx-page .gpx-stat {
          padding: 9px 13px;
          border: 1px solid rgba(217,182,93,.2);
          border-radius: 8px;
          color: #e8cc82;
          background: rgba(217,182,93,.06);
          font-size: 13px;
        }

        .gpx-page .gpx-message {
          margin-top: 16px;
          color: #e8cc82;
        }

        @media(max-width: 600px) {
          .gpx-page .gpx-panel { padding: 17px; }
          .gpx-page .gpx-route { align-items: flex-start; }
          .gpx-page .gpx-route-actions { width: 100%; }
        }
      `}</style>

      <button className="text-button" onClick={onBack}>
        ← Retour à l'aventure
      </button>

      <div className="section-heading" style={{ marginTop: "25px" }}>
        <div>
          <span className="eyebrow">ADVENTURE TRAIL · GPS</span>
          <h2>Itinéraires GPS</h2>
          <p className="trip-location">{trip.name}</p>
        </div>
      </div>

      <article className="gpx-panel">
        <h3>🧭 Les parcours de l'expédition</h3>

        <p>
          Importe plusieurs fichiers GPX pour préparer les différentes
          étapes de ton aventure et les partager avec les participants.
        </p>

        <label className="gpx-upload">
          <strong>＋ Ajouter des parcours GPX</strong>
          <p className="profile-muted">
            Tu peux sélectionner plusieurs fichiers en même temps.
          </p>
          <input
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            multiple
            onChange={importGPX}
          />
        </label>

        <div className="gpx-summary">
          <span className="gpx-stat">
            {routes.length} parcours
          </span>
          <span className="gpx-stat">
            {totalPoints} points GPS
          </span>
        </div>

        {routes.length === 0 ? (
          <p className="profile-muted">
            Aucun parcours importé pour le moment.
          </p>
        ) : (
          <div>
            {routes.map((route, index) => (
              <div className="gpx-route" key={route.id}>
                <div>
                  <div className="gpx-route-name">
                    {String(index + 1).padStart(2, "0")} · {route.name}
                  </div>
                  <span className="profile-muted">
                    {route.track.length} points GPS
                  </span>
                </div>

                <div className="gpx-route-actions">
                  <button
                    type="button"
                    onClick={() => downloadRoute(route)}
                  >
                    Télécharger ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRoute(route.id)}
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {routes.length > 0 && (
          <div style={{ marginTop: "25px" }}>
            <h3>Carte des parcours</h3>
            <MeetingPointMap
              meetingPoint={null}
              onSelect={() => {}}
              gpxTracks={allTracks}
            />
          </div>
        )}

        <button
          className="primary-button full-button"
          onClick={saveGPX}
          disabled={saving}
          style={{ marginTop: "25px" }}
        >
          {saving ? "Enregistrement..." : "Enregistrer et partager →"}
        </button>

        {message && (
          <p className="gpx-message" role="status">
            {message}
          </p>
        )}
      </article>
    </section>
  );
}
