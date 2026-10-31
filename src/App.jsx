
import { useState, useEffect, useMemo } from "react";
import { db, connectAnonymousUser } from "./firebase";
import {
  collection,
  collectionGroup,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import "./style.css";

function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(5);
  window.crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (byte) => alphabet[byte % alphabet.length]
  ).join("");
}

export default function App() {
  const [createdInviteCode, setCreatedInviteCode] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [ownerTrips, setOwnerTrips] = useState([]);
  const [joinedTrips, setJoinedTrips] = useState([]);
  const [userId, setUserId] = useState(null);
  const [firebaseStatus, setFirebaseStatus] = useState("Connexion...");
  const [errorMessage, setErrorMessage] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [tripName, setTripName] = useState("");
  const [tripLocation, setTripLocation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [joinFirstName, setJoinFirstName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [saving, setSaving] = useState(false);

  const trips = useMemo(() => {
    const allTrips = [...ownerTrips, ...joinedTrips];
    return Array.from(
      new Map(allTrips.map((trip) => [trip.id, trip])).values()
    );
  }, [ownerTrips, joinedTrips]);

  useEffect(() => {
    let unsubscribeOwner = null;
    let unsubscribeMembers = null;
    let cancelled = false;

    async function startFirebase() {
      try {
        const result = await connectAnonymousUser();
        const user = result.user;

        if (cancelled) return;

        setUserId(user.uid);
        setFirebaseStatus("Connecté à Firebase");

        const ownerQuery = query(
          collection(db, "trips"),
          where("ownerId", "==", user.uid)
        );

        unsubscribeOwner = onSnapshot(
          ownerQuery,
          (snapshot) => {
            setOwnerTrips(
              snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data(),
                myRole: "owner",
              }))
            );
          },
          (error) => {
            console.error(error);
            setErrorMessage(error.message);
          }
        );

        const membersQuery = query(
          collectionGroup(db, "members"),
          where("uid", "==", user.uid)
        );

        unsubscribeMembers = onSnapshot(
          membersQuery,
          async (snapshot) => {
            try {
              const results = await Promise.all(
                snapshot.docs.map(async (memberDoc) => {
                  const tripRef = memberDoc.ref.parent.parent;

                  if (!tripRef) return null;

                  const tripSnapshot = await getDoc(tripRef);

                  if (!tripSnapshot.exists()) return null;

                  return {
                    id: tripSnapshot.id,
                    ...tripSnapshot.data(),
                    myRole: memberDoc.data().role || "member",
                  };
                })
              );

              if (!cancelled) {
                setJoinedTrips(results.filter(Boolean));
              }
            } catch (error) {
              console.error(error);
              setErrorMessage(error.message);
            }
          },
          (error) => {
            console.error(error);
            setErrorMessage(error.message);
          }
        );
      } catch (error) {
        console.error("Erreur Firebase :", error);
        setFirebaseStatus("Erreur Firebase : " + error.code);
        setErrorMessage(error.message);
      }
    }

    startFirebase();

    return () => {
      cancelled = true;
      if (unsubscribeOwner) unsubscribeOwner();
      if (unsubscribeMembers) unsubscribeMembers();
    };
  }, []);

  async function createTrip(e) {
    e.preventDefault();

    if (
      !tripName.trim() ||
      !firstName.trim() ||
      !userId ||
      saving
    ) return;

    setSaving(true);
    setErrorMessage("");

    try {
      let code;

do {
  code = generateInviteCode();
} while (
  (await getDoc(doc(db, "invites", code))).exists()
);

      const tripRef = await addDoc(collection(db, "trips"), {
        ownerId: userId,
        name: tripName.trim(),
        location: tripLocation.trim() || "Destination à définir",
        dates: "Dates à définir",
        participants: 1,
        status: "Préparation",
        icon: "🏍️",
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "trips", tripRef.id, "members", userId),
        {
          uid: userId,
          firstName: firstName.trim(),
          role: "owner",
          joinedAt: serverTimestamp(),
        }
      );

      await setDoc(doc(db, "invites", code), {
        tripId: tripRef.id,
        ownerId: userId,
        createdAt: serverTimestamp(),
      });

      setTripName("");
      setTripLocation("");
      setShowCreate(false);

      setCreatedInviteCode(code);
      setCopyStatus("");
    
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
      alert("Impossible de créer le road trip : " + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function joinTrip(e) {
    e.preventDefault();

    if (
      !inviteCode.trim() ||
      !joinFirstName.trim() ||
      !userId ||
      saving
    ) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const code = inviteCode.trim().toUpperCase();
      const inviteSnapshot = await getDoc(doc(db, "invites", code));

      if (!inviteSnapshot.exists()) {
        throw new Error("Ce code d'invitation est introuvable.");
      }

      const invite = inviteSnapshot.data();
      const tripId = invite.tripId;

      if (!tripId) {
        throw new Error("Cette invitation n'est pas valide.");
      }

      await setDoc(
        doc(db, "trips", tripId, "members", userId),
        {
          uid: userId,
          firstName: joinFirstName.trim(),
          role: "member",
          inviteCode: code,
          joinedAt: serverTimestamp(),
        }
      );

      const tripSnapshot = await getDoc(doc(db, "trips", tripId));

      setInviteCode("");
      setJoinFirstName("");
      setShowJoin(false);

      alert(
        tripSnapshot.exists()
          ? "Bienvenue dans : " + tripSnapshot.data().name + " !"
          : "Tu as rejoint le road trip !"
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
      alert("Impossible de rejoindre le voyage : " + error.message);
    } finally {
      setSaving(false);
    }
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

        <button
          className="outline-button"
          onClick={() => setShowJoin(true)}
        >
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
          <button
            className="primary-button"
            onClick={() => setShowCreate(true)}
          >
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

          <button
            className="text-button"
            onClick={() => setShowCreate(true)}
          >
            + Nouvelle aventure
          </button>
        </div>

        <p style={{ color: "#ff8a35", fontSize: "13px" }}>
          {firebaseStatus}
        </p>

        {errorMessage && (
          <p style={{ color: "#ff5555" }}>{errorMessage}</p>
        )}

        {trips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏍️</div>
            <h3>Prêt à prendre la route ?</h3>
            <p>
              Créez votre premier road trip et invitez vos compagnons.
            </p>
            <button
              className="primary-button"
              onClick={() => setShowCreate(true)}
            >
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
                  <span className="trip-number">
                    AT / {String(trip.id).slice(-3)}
                  </span>
                </div>

                <div className="trip-info">
                  <span className="trip-location">{trip.location}</span>
                  <h3>{trip.name}</h3>

                  <div className="trip-meta">
                    <span>◷ {trip.dates}</span>
                    <span>♟ {trip.participants} participant(s)</span>
                  </div>

                  <p style={{ color: "#ff8a35", fontSize: "12px" }}>
                    {trip.myRole === "owner"
                      ? "Organisateur"
                      : "Participant"}
                  </p>

                  <button
                    className="trip-link"
                    onClick={() =>
                      alert(
                        "La page détaillée sera ajoutée prochainement."
                      )
                    }
                  >
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
        <div
          className="modal-backdrop"
          onClick={() => setShowCreate(false)}
        >
          <form
            className="modal"
            onSubmit={createTrip}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowCreate(false)}
            >
              ×
            </button>

            <span className="eyebrow">NOUVELLE EXPÉDITION</span>
            <h2>Créer un road trip</h2>

            <label>Ton prénom</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex. : Alex"
              required
            />

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

            <button
              className="primary-button full-button"
              type="submit"
              disabled={saving || !userId}
            >
              {saving ? "Enregistrement..." : "Créer l'aventure →"}
            </button>
          </form>
        </div>
      )}

      {showJoin && (
        <div
          className="modal-backdrop"
          onClick={() => setShowJoin(false)}
        >
          <form
            className="modal"
            onSubmit={joinTrip}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowJoin(false)}
            >
              ×
            </button>

            <span className="eyebrow">REJOINDRE UNE ÉQUIPE</span>
            <h2>Bienvenue, rider !</h2>
            <p>
              Entre ton prénom et le code transmis par l'organisateur.
            </p>

            <label>Ton prénom</label>
            <input
              value={joinFirstName}
              onChange={(e) => setJoinFirstName(e.target.value)}
              placeholder="Ex. : Alex"
              required
            />

            <label>Code d'invitation</label>
            <input
              value={inviteCode}
              onChange={(e) =>
                setInviteCode(e.target.value.toUpperCase())
              }
              placeholder="Colle ton code ici"
              required
            />

            <button
              className="primary-button full-button"
              type="submit"
              disabled={saving || !userId}
            >
              {saving ? "Connexion..." : "Rejoindre le road trip →"}
            </button>
          </form>
        </div>
      )}
      {createdInviteCode && (
  <div className="modal-backdrop">
    <div className="modal">
      <span className="eyebrow">INVITATION PRÊTE</span>
      <h2>Ton équipe t'attend !</h2>

      <p>Voici le code à transmettre à tes compagnons :</p>

      <div style={{
        fontSize: "32px",
        fontWeight: "bold",
        letterSpacing: "6px",
        textAlign: "center",
        padding: "20px",
        color: "#ff8a35"
      }}>
        {createdInviteCode}
      </div>

      <button
        className="primary-button full-button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(createdInviteCode);
            setCopyStatus("Code copié !");
          } catch (error) {
            setCopyStatus("Copie impossible. Sélectionne le code manuellement.");
          }
        }}
      >
        {copyStatus === "Code copié !" ? "✓ Code copié !" : "📋 Copier le code"}
      </button>

      {copyStatus && (
        <p style={{ textAlign: "center", color: "#ff8a35" }}>
          {copyStatus}
        </p>
      )}

      <button
        className="outline-button full-button"
        onClick={() => setCreatedInviteCode("")}
      >
        Fermer
      </button>
    </div>
  </div>
)}
    </main>
  );
}
