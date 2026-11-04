
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

function createRiderIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #D9B65D;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #171813;
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

  const isMember = tripMembers.some(
    (member) => (member.uid || member.id) === userId
  );

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
        <p>Tu dois être membre de cette aventure pour accéder au suivi GPS.</p>
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

  const mapCenter = myLocation
    ? [myLocation.lat, myLocation.lng]
    : otherLocations.length
      ? [otherLocations[0].lat, otherLocations[0].lng]
      : [46.6, 2.2];

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

      <div className="trip-card" style={{ marginTop: "20px" }}>
        <div className="trip-info">
          <span className="eyebrow">CARTE EN DIRECT</span>
          <h3>Riders connectés ({locations.length})</h3>

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

                {locations.map((location) => {
                  if (
                    !Number.isFinite(Number(location.lat)) ||
                    !Number.isFinite(Number(location.lng))
                  ) {
                    return null;
                  }

                  const member = tripMembers.find(
                    (item) =>
                      (item.uid || item.id) === location.uid
                  );

                  return (
                    <Marker
                      key={location.uid}
                      position={[
                        Number(location.lat),
                        Number(location.lng),
                      ]}
                      icon={createRiderIcon()}
                    >
                      <Popup>
                        <strong>
                          {member?.firstName ||
                            (location.uid === userId
                              ? "Moi"
                              : "Rider")}
                        </strong>
                        <br />
                        {location.uid === userId
                          ? "Ta position"
                          : "Position partagée"}
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}

          {!loading && locations.length === 0 && (
            <p style={{ marginTop: "15px" }}>
              Aucun membre ne partage sa position pour le moment.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
