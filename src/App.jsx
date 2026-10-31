
import { useState } from "react";
import "./style.css";

const initialTrips = [
  {
    id: 1,
    name: "Traversée des Alpes",
    location: "France · Alpes",
    dates: "12 — 16 juin 2027",
    participants: 4,
    status: "À venir",
    icon: "⛰️",
  },
  {
    id: 2,
    name: "Les pistes du Maroc",
    location: "Maroc · Atlas & désert",
    dates: "À définir",
    participants: 6,
    status: "Préparation",
    icon: "🏜️",
  },
];

export default function App() {
  const [trips, setTrips] = useState(() => {
    const saved = localStorage.getItem("adventure-trips");
    return saved ? JSON.parse(saved) : initialTrips;
  });

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [tripName, setTripName] = useState("");
  const [tripLocation, setTripLocation] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  function createTrip(e) {
    e.preventDefault();
    if (!tripName.trim()) return;

    const newTrip = {
      id: Date.now(),
      name: tripName,
      location: tripLocation || "Destination à définir",
      dates: "Dates à définir",
      participants: 1,
      status: "Préparation",
      icon: "🏍️",
    };

    const updated = [newTrip, ...trips];
    setTrips(updated);
    localStorage.setItem("adventure-trips", JSON.stringify(updated));
    setTripName("");
    setTripLocation("");
    setShowCreate(false);
  }

  function joinTrip(e) {
    e.preventDefault();
    alert(
      `Le code ${inviteCode} sera vérifié avec Firebase à la prochaine étape.`
    );
    setInviteCode("");
    setShowJoin(false);
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-icon">A</span>
          <span>
            ADVENTURE<span className="orange">TRAIL</span>
            <small>RIDE · EXPLORE · SHARE</small>
          </span>
        </a>

        <button className="outline-button" onClick={() => setShowJoin(true)}>
          Rejoindre avec un code
        </button>
      </header>

      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">L'AVENTURE COMMENCE ICI</span>
          <h1>
            LA ROUTE
            <br />
            <span>EST À VOUS.</span>
          </h1>
          <p>
            Organisez vos road trips moto, partagez vos itinéraires
            et préparez vos aventures ensemble.
          </p>
          <button className="primary-button" onClick={() => setShowCreate(true)}>
            <span>＋</span> Créer un road trip
          </button>
        </div>
        <div className="hero-stamp">
          <span>BUILT FOR</span>
          <strong>ADVENTURE</strong>
          <span>NO ROAD · NO LIMIT</span>
        </div>
      </section>

      <section className="trips-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">VOTRE GARAGE À AVENTURES</span>
            <h2>Mes road trips <span>({trips.length})</span></h2>
          </div>
          <button className="text-button" onClick={() => setShowCreate(true)}>
            + Nouvelle aventure
          </button>
        </div>

        {trips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏍️</div>
            <h3>Prêt à prendre la route ?</h3>
            <p>Créez votre premier road trip et invitez vos compagnons.</p>
            <button className="primary-button" onClick={() => setShowCreate(true)}>
              Créer mon premier road trip
            </button>
          </div>
        ) : (
          <div className="trip-grid">
            {trips.map((trip) => (
              <article className="trip-card" key={trip.id}>
                <div className="trip-art">
                  <span className="trip-emoji">{trip.icon}</span>
                  <span className="trip-status">{trip.status}</span>
                  <span className="trip-number">AT / {String(trip.id).slice(-3)}</span>
                </div>
                <div className="trip-info">
                  <span className="trip-location">{trip.location}</span>
                  <h3>{trip.name}</h3>
                  <div className="trip-meta">
                    <span>◷ {trip.dates}</span>
                    <span>♟ {trip.participants} participant(s)</span>
                  </div>
                  <button className="trip-link" onClick={() => alert("La page du road trip sera ajoutée à l'étape suivante.")}>
                    Ouvrir l'aventure <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        <span>ADVENTURE TRAIL</span>
        <span>FAITES DE LA ROUTE UNE AVENTURE.</span>
        <span>© 2026</span>
      </footer>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <form className="modal" onSubmit={createTrip} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            <span className="eyebrow">NOUVELLE EXPÉDITION</span>
            <h2>Créer un road trip</h2>
            <label>Nom de l'aventure</label>
            <input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Ex. : Tour des Pyrénées"
              required
            />
            <label>Destination</label>
            <input
              value={tripLocation}
              onChange={(e) => setTripLocation(e.target.value)}
              placeholder="Ex. : France · Pyrénées"
            />
            <button className="primary-button full-button" type="submit">
              Créer l'aventure →
            </button>
          </form>
        </div>
      )}

      {showJoin && (
        <div className="modal-backdrop" onClick={() => setShowJoin(false)}>
          <form className="modal" onSubmit={joinTrip} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowJoin(false)}>×</button>
            <span className="eyebrow">REJOINDRE UNE ÉQUIPE</span>
            <h2>Vous avez un code ?</h2>
            <p>Entrez le code d'invitation transmis par l'organisateur.</p>
            <label>Code d'invitation</label>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Ex. : TRAIL-2027"
              required
            />
            <button className="primary-button full-button" type="submit">
              Rejoindre le road trip →
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

