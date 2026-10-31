import { useEffect, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

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
    xml.querySelectorAll("trkpt, rtept")
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

export default function GpxPage({ trip, onBack }) {
  const [gpxTrack, setGpxTrack] = useState(trip.gpxTrack || []);
  const [gpxContent, setGpxContent] = useState(trip.gpxContent || "");
  const [gpxFileName, setGpxFileName] = useState(trip.gpxFileName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGpxTrack(trip.gpxTrack || []);
    setGpxContent(trip.gpxContent || "");
    setGpxFileName(trip.gpxFileName || "");
  }, [trip.id, trip.gpxTrack, trip.gpxContent, trip.gpxFileName]);

  async function importGPX(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setMessage("");

    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setMessage("Choisis un fichier avec l'extension .gpx.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_GPX_SIZE) {
      setMessage("Fichier trop volumineux : maximum 700 Ko.");
      event.target.value = "";
      return;
    }

    try {
      const content = await file.text();
      const points = parseGPX(content);

      setGpxContent(content);
      setGpxTrack(points);
      setGpxFileName(file.name);
      setMessage("Parcours importé ! Pense à l'enregistrer.");
    } catch (error) {
      setMessage(error.message);
    }

    event.target.value = "";
  }

  async function saveGPX() {
    if (!gpxContent || saving) return;

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "trips", trip.id), {
        gpxContent,
        gpxTrack,
        gpxFileName,
        updatedAt: serverTimestamp(),
      });

      setMessage("Parcours GPX enregistré et partagé !");
    } catch (error) {
      console.error(error);
      setMessage("Erreur : " + error.message);
    } finally {
      setSaving(false);
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
        ← Retour à l'aventure
      </button>

      <div className="section-heading" style={{ marginTop: "25px" }}>
        <div>
          <span className="eyebrow">ADVENTURE TRAIL · GPS</span>
          <h2>Itinéraire GPS</h2>
          <p className="trip-location">{trip.name}</p>
        </div>
      </div>

      <article className="trip-card">
        <div className="trip-info">
          <h3>🧭 Le parcours de l'expédition</h3>

          <p>
            Importe ton fichier GPX pour partager le tracé
            avec les participants du road trip.
          </p>

          <label>Choisir un fichier GPX</label>
          <input
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            onChange={importGPX}
          />

          {gpxFileName && (
            <p style={{ marginTop: "15px" }}>
              <strong>Fichier :</strong> {gpxFileName}
            </p>
          )}

          {gpxTrack.length > 0 && (
            <p style={{ color: "#D9B65D" }}>
              {gpxTrack.length} points GPS chargés.
            </p>
          )}

          <button
            className="primary-button full-button"
            onClick={saveGPX}
            disabled={!gpxContent || saving}
            style={{ marginTop: "15px" }}
          >
            {saving ? "Enregistrement..." : "Enregistrer et partager →"}
          </button>

          <button
            className="primary-button full-button"
            onClick={downloadGPX}
            disabled={!gpxContent}
            style={{ marginTop: "10px" }}
          >
            Télécharger le fichier GPX ↓
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