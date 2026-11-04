import { useEffect, useState } from "react";
import L from "leaflet";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";
import { db } from "../firebase";

// Couleurs des statuts
const STATUS_COLORS = {
  live: "#35B86B",
  weak: "#D9B65D",
  offline: "#E05252",
  inactive: "#888888",
};

// Conversion de la date Firebase en millisecondes
function getTimestamp(updatedAt) {
  if (!updatedAt) return 0;

  if (typeof updatedAt.toMillis === "function") {
    return updatedAt.toMillis();
  }

  if (updatedAt instanceof Date) {
    return updatedAt.getTime();
  }

  if (typeof updatedAt.seconds === "number") {
    return updatedAt.seconds * 1000;
  }

  return 0;
}

// Calcul du statut selon l'ancienneté de la position
function getLocationStatus(location, now) {
  const timestamp = getTimestamp(location.updatedAt);

  if (!timestamp) {
    return "offline";
  }

  const elapsed = Math.max(0, now - timestamp);

  if (elapsed < 60 * 1000) {
    return "live";
  }

  if (elapsed <= 5 * 60 * 1000) {
    return "weak";
  }

  return "offline";
}

// Libellé du statut
function getStatusLabel(status) {
  switch (status) {
    case "live":
      return "En direct";
    case "weak":
      return "Réseau faible";
    case "offline":
      return "Hors ligne";
    default:
      return "Pas de partage";
  }
}

// Temps écoulé depuis la dernière position
function getTimeAgo(updatedAt, now) {
  const timestamp = getTimestamp(updatedAt);

  if (!timestamp) {
    return "Aucune position reçue";
  }

  const seconds = Math.max(
    0,
    Math.floor((now - timestamp) / 1000)
  );

  if (seconds < 60) {
    return `Il y a ${seconds} seconde${seconds > 1 ? "s" : ""}`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `Il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
  }

  const hours = Math.floor(minutes / 60);

  return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;
}

// Création de l'icône du rider avec sa couleur de statut
function createRiderIcon(status) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.offline;

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
      ">●</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export default function LiveTracking({
  trip,
  tripMembers = [],
  userId,
  onBack,
}) {
  const [sharing, setSharing] = useState(false);
  const [locations, setLocations] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Horloge locale pour actualiser les statuts sans écrire dans Firebase
  const [now, setNow] = useState(Date.now());

  const isMember = tripMembers.some(
    (member) => (member.uid || member.id) === userId
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Écoute des positions des participants
  useEffect(() => {
    if (!trip?.id || !isMember) {
      setLoading(false);
      return;
    }

    const locationsRef = collection(
      db,
      "trips",
      trip.id,
      "liveLocations"
    );

    const unsubscribe = onSnapshot(
      locationsRef,
      (snapshot) => {
        const currentLocations = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setLocations(currentLocations);
        setNow(Date.now());
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setMessage("Impossible de charger les positions.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [trip?.id, isMember]);

  // Partage de sa propre position
  useEffect(() => {
    if (!sharing || !userId || !trip?.id) return;

    if (!navigator.geolocation) {
      setMessage(
        "La géolocalisation n'est pas disponible sur ce navigateur."
      );
      setSharing(false);
      return;
    }

    setMessage("Recherche de ta position GPS...");

    const locationRef = doc(
      db,
      "trips",
      trip.id,
      "liveLocations",
      userId
    );

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await setDoc(locationRef, {
            uid: userId,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            updatedAt: serverTimestamp(),
            sharing: true,
          });

          setMessage("Ta position est partagée.");
        } catch (error) {
          console.error(error);
          setMessage(
            "Impossible d'enregistrer ta position. Vérifie les accès Firebase."
          );
        }
      },
      (error) => {
        console.error(error);

        if (error.code === error.PERMISSION_DENIED) {
          setMessage(
            "Autorise la géolocalisation dans les paramètres du navigateur."
          );
        } else {
          setMessage("Impossible de récupérer ta position GPS.");
        }

        setSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [sharing, userId, trip?.id]);

  // Arrêt du partage
  async function stopSharing() {
    setSharing(false);
    setMessage("Arrêt du partage de position...");

    try {
      await deleteDoc(
        doc(db, "trips", trip.id, "liveLocations", userId)
      );

      setMessage("Le partage de ta position est désactivé.");
    } catch (error) {
      console.error(error);
      setMessage(
        "Le partage est arrêté, mais la position enregistrée n'a pas pu être supprimée."
      );
    }
  }

  if (!isMember) {
    return (
      <section className="trips-section">
        <button className="text-button" onClick={onBack}>
          ← Retour à l'aventure
        </button>

        <h2>Accès réservé aux membres</h2>
        <p>
          Tu dois être membre de cette aventure pour accéder au suivi GPS.
        </p>
      </section>
    );
  }

  const myLocation = locations.find(
    (location) => location.uid === userId
  );

  const otherLocations = locations.filter(
    (location) =>
      location.uid !== userId &&
      Number.isFinite(Number(location.lat)) &&
      Number.isFinite(Number(location.lng))
  );

  const validLocations = locations.filter(
    (location) =>
      Number.isFinite(Number(location.lat)) &&
      Number.isFinite(Number(location.lng))
  );

  const mapCenter = myLocation
    ? [Number(myLocation.lat), Number(myLocation.lng)]
    : otherLocations.length
      ? [
          Number(otherLocations[0].lat),
          Number(otherLocations[0].lng),
        ]
      : [46.6, 2.2];

  // Statistiques des statuts
  const statusCounts = {
    live: 0,
    weak: 0,
    offline: 0,
  };

  validLocations.forEach((location) => {
    const status = getLocationStatus(location, now);
    statusCounts[status]++;
  });

  return (
    <section className="trips-section">
      <button className="text-button" onClick={onBack}>
        ← Retour à l'aventure
      </button>

      <div className="section-heading" style={{ marginTop: "25px" }}>
        <div>
          <span className="eyebrow">SUIVI GPS</span>
          <h2>Position des riders</h2>
          <p className="trip-location">{trip.name}</p>
        </div>
      </div>

      {/* Mon partage */}
      <article className="trip-card" style={{ marginTop: "20px" }}>
        <div className="trip-info">
          <span className="eyebrow">TON PARTAGE</span>

          <h3>
            {sharing
              ? "📡 Partage activé"
              : "📍 Partage désactivé"}
          </h3>

          <p>
            {sharing
              ? "Ta position est envoyée lorsque le GPS la met à jour."
              : "Active le partage pour apparaître sur la carte de l'équipe."}
          </p>

          {sharing ? (
            <button
              className="outline-button full-button"
              onClick={stopSharing}
            >
              Arrêter le partage
            </button>
          ) : (
            <button
              className="primary-button full-button"
              onClick={() => {
                setMessage("");
                setSharing(true);
              }}
            >
              Activer ma position GPS
            </button>
          )}

          {message && (
            <p style={{ color: "#D9B65D", marginTop: "12px" }}>
              {message}
            </p>
          )}
        </div>
      </article>

      {/* Résumé des statuts */}
      <article className="trip-card" style={{ marginTop: "20px" }}>
        <div className="trip-info">
          <span className="eyebrow">ÉTAT DU SUIVI</span>
          <h3>État des positions reçues</h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            {[
              {
                key: "live",
                label: "En direct",
              },
              {
                key: "weak",
                label: "Réseau faible",
              },
              {
                key: "offline",
                label: "Hors ligne",
              },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 12px",
                  borderRadius: "20px",
                  background: "rgba(128,128,128,0.12)",
                  fontSize: "13px",
                }}
              >
                <span
                  style={{
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    background: STATUS_COLORS[item.key],
                  }}
                />

                {item.label} : {statusCounts[item.key]}
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Liste des participants */}
      <article className="trip-card" style={{ marginTop: "20px" }}>
        <div className="trip-info">
          <span className="eyebrow">PARTICIPANTS</span>
          <h3>État du suivi GPS</h3>

          {tripMembers.map((member) => {
            const memberId = member.uid || member.id;

            const location = locations.find(
              (item) => item.uid === memberId
            );

            const status = location
              ? getLocationStatus(location, now)
              : "inactive";

            const statusColor =
              STATUS_COLORS[status] || STATUS_COLORS.inactive;

            return (
              <div
                key={memberId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "12px 0",
                  borderBottom:
                    "1px solid rgba(217,182,93,0.15)",
                }}
              >
                <div>
                  <strong>
                    {member.firstName ||
                      (memberId === userId ? "Moi" : "Rider")}
                  </strong>

                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "12px",
                      opacity: 0.7,
                    }}
                  >
                    {location
                      ? getTimeAgo(location.updatedAt, now)
                      : "Aucune position partagée"}
                  </p>
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: statusColor,
                    fontSize: "12px",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: statusColor,
                    }}
                  />
                  {getStatusLabel(status)}
                </span>
              </div>
            );
          })}
        </div>
      </article>

      {/* Carte */}
      <div className="trip-card" style={{ marginTop: "20px" }}>
        <div className="trip-info">
          <span className="eyebrow">CARTE EN DIRECT</span>
          <h3>Riders sur la carte ({validLocations.length})</h3>

          {loading ? (
            <p>Chargement des positions...</p>
          ) : (
            <div
              style={{
                height: "420px",
                width: "100%",
                marginTop: "15px",
                overflow: "hidden",
                borderRadius: "12px",
              }}
            >
              <MapContainer
                center={mapCenter}
                zoom={myLocation || otherLocations.length ? 12 : 6}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {validLocations.map((location) => {
                  const member = tripMembers.find(
                    (item) =>
                      (item.uid || item.id) === location.uid
                  );

                  const status = getLocationStatus(location, now);

                  return (
                    <Marker
                      key={location.uid}
                      position={[
                        Number(location.lat),
                        Number(location.lng),
                      ]}
                      icon={createRiderIcon(status)}
                    >
                      <Popup>
                        <strong>
                          {member?.firstName ||
                            (location.uid === userId
                              ? "Moi"
                              : "Rider")}
                        </strong>

                        <br />

                        <span
                          style={{
                            color:
                              STATUS_COLORS[status],
                            fontWeight: "bold",
                          }}
                        >
                          {getStatusLabel(status)}
                        </span>

                        <br />

                        {getTimeAgo(location.updatedAt, now)}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}

          {!loading && validLocations.length === 0 && (
            <p style={{ marginTop: "15px" }}>
              Aucun membre ne partage sa position pour le moment.
            </p>
          )}

          <p
            style={{
              marginTop: "12px",
              fontSize: "12px",
              opacity: 0.7,
            }}
          >
            Les statuts sont actualisés automatiquement toutes les
            15 secondes.
          </p>
        </div>
      </div>
    </section>
  );
}
