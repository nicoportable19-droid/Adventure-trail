
import { useState, useEffect, useMemo } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  updateDoc,
} from "firebase/firestore";

import Home from "./pages/Home";
import Trip from "./pages/Trip";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import "./style.css";
import "./auth.css";

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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authPage, setAuthPage] = useState("login");

  const [createdInviteCode, setCreatedInviteCode] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const [ownerTrips, setOwnerTrips] = useState([]);
  const [joinedTrips, setJoinedTrips] = useState([]);

  const [firebaseStatus, setFirebaseStatus] = useState("Connexion...");
  const [errorMessage, setErrorMessage] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [tripName, setTripName] = useState("");
  const [tripLocation, setTripLocation] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [saving, setSaving] = useState(false);

  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripMembers, setTripMembers] = useState([]);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  const [profilePseudo, setProfilePseudo] = useState("");

  const userId = user?.uid || null;

  const firstName =
    profilePseudo?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split("@")[0] ||
    "Rider";

  const trips = useMemo(() => {
    const allTrips = [...ownerTrips, ...joinedTrips];

    return Array.from(
      new Map(allTrips.map((trip) => [trip.id, trip])).values()
    );
  }, [ownerTrips, joinedTrips]);

  // Surveiller la connexion au compte Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setFirebaseStatus("Connecté à Firebase");
        setErrorMessage("");
      } else {
        setFirebaseStatus("Non connecté");
        setOwnerTrips([]);
        setJoinedTrips([]);
        setSelectedTrip(null);
        setTripMembers([]);
        setShowProfile(false);
        setProfilePseudo("");
      }
    });

    return () => unsubscribe();
  }, []);

  // Charger le pseudo public du profil
  useEffect(() => {
    if (!userId) {
      setProfilePseudo("");
      return;
    }

    const profileRef = doc(db, "users", userId);

    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        setProfilePseudo(
          snapshot.exists() ? snapshot.data().pseudo || "" : ""
        );
      },
      (error) => {
        console.error("Lecture du profil :", error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Charger les aventures du compte connecté
  useEffect(() => {
    if (!userId) {
      setOwnerTrips([]);
      setJoinedTrips([]);
      return;
    }

    let unsubscribeOwner = null;
    let unsubscribeMembers = null;
    let cancelled = false;

    const ownerQuery = query(
      collection(db, "trips"),
      where("ownerId", "==", userId)
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
        console.error("Lecture aventures créées :", error);
        setErrorMessage("Lecture aventures créées : " + error.message);
      }
    );

    const membersQuery = query(
      collectionGroup(db, "members"),
      where("uid", "==", userId)
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
          console.error("Lecture d'une aventure :", error);
          setErrorMessage("Lecture d'une aventure : " + error.message);
        }
      },
      (error) => {
        console.error("Lecture des participations :", error);
        setErrorMessage("Lecture des participations : " + error.message);
      }
    );

    return () => {
      cancelled = true;
      if (unsubscribeOwner) unsubscribeOwner();
      if (unsubscribeMembers) unsubscribeMembers();
    };
  }, [userId]);

  // Mise à jour en temps réel de la page détaillée
  useEffect(() => {
    if (!selectedTrip?.id || !userId) return;

    const tripRef = doc(db, "trips", selectedTrip.id);
    const membersRef = collection(
      db,
      "trips",
      selectedTrip.id,
      "members"
    );

    const unsubscribeTrip = onSnapshot(
      tripRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setSelectedTrip((current) => ({
            ...current,
            ...snapshot.data(),
          }));
        }
      },
      (error) => {
        console.error(error);
        setErrorMessage(error.message);
      }
    );

    const unsubscribeMembers = onSnapshot(
      membersRef,
      (snapshot) => {
        setTripMembers(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (error) => {
        console.error(error);
        setErrorMessage(error.message);
      }
    );

    return () => {
      unsubscribeTrip();
      unsubscribeMembers();
    };
  }, [selectedTrip?.id, userId]);

  function openTrip(trip) {
    setSelectedTrip(trip);
    setEditName(trip.name || "");
    setEditLocation(trip.location || "");
    setErrorMessage("");
    setTripMembers([]);
    setShowProfile(false);
  }

  function closeTrip() {
    setSelectedTrip(null);
    setTripMembers([]);
    setErrorMessage("");
  }

  function openProfile() {
    setSelectedTrip(null);
    setTripMembers([]);
    setShowProfile(true);
    setErrorMessage("");
  }

  function closeProfile() {
    setShowProfile(false);
  }

  // Déconnexion
  async function handleSignOut() {
    try {
      await signOut(auth);
      closeTrip();
      setShowProfile(false);
      setCreatedInviteCode("");
      setShowCreate(false);
      setShowJoin(false);
      setAuthPage("login");
    } catch (error) {
      console.error(error);
      setErrorMessage("Impossible de se déconnecter : " + error.message);
    }
  }

  // Créer un road trip
  async function createTrip(e) {
    e.preventDefault();

    if (!tripName.trim() || !userId || saving) return;

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
        inviteCode: code,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "trips", tripRef.id, "members", userId),
        {
          uid: userId,
          firstName,
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

  // Créer un code pour une ancienne aventure
  async function createInviteCodeForTrip() {
    if (!selectedTrip || selectedTrip.myRole !== "owner" || saving) {
      return;
    }

    if (selectedTrip.inviteCode) return;

    setSaving(true);
    setErrorMessage("");

    try {
      let code;

      do {
        code = generateInviteCode();
      } while (
        (await getDoc(doc(db, "invites", code))).exists()
      );

      await setDoc(doc(db, "invites", code), {
        tripId: selectedTrip.id,
        ownerId: userId,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "trips", selectedTrip.id), {
        inviteCode: code,
        updatedAt: serverTimestamp(),
      });

      setCreatedInviteCode(code);
      setCopyStatus("");
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
      alert("Impossible de créer le code : " + error.message);
    } finally {
      setSaving(false);
    }
  }

  // Rejoindre un road trip
  async function joinTrip(e) {
    e.preventDefault();

    if (!inviteCode.trim() || !userId || saving) return;

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
          firstName,
          role: "member",
          inviteCode: code,
          joinedAt: serverTimestamp(),
        }
      );

      const tripSnapshot = await getDoc(doc(db, "trips", tripId));

      setInviteCode("");
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

  // Enregistrer les modifications
  async function saveTripDetails(e) {
    e.preventDefault();

    if (!selectedTrip || savingDetails) return;

    if (!editName.trim()) {
      alert("Le nom de l'aventure est obligatoire.");
      return;
    }

    setSavingDetails(true);
    setErrorMessage("");

    try {
      await updateDoc(doc(db, "trips", selectedTrip.id), {
        name: editName.trim(),
        location: editLocation.trim() || "Destination à définir",
        updatedAt: serverTimestamp(),
      });

      alert("Les modifications ont bien été enregistrées !");
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
      alert("Impossible d'enregistrer : " + error.message);
    } finally {
      setSavingDetails(false);
    }
  }

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">ADVENTURE TRAIL</div>
          <p className="auth-description">
            Vérification de ta connexion...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return authPage === "register" ? (
      <Register onGoToLogin={() => setAuthPage("login")} />
    ) : (
      <Login onGoToRegister={() => setAuthPage("register")} />
    );
  }

  return (
    <main className="app">
      <style>{`
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          padding: 18px 4%;
        }

        .topbar .brand {
          flex-shrink: 0;
        }

        .topbar-actions {
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .topbar-actions .user-welcome {
          margin-right: 12px;
          padding-right: 8px;
          color: #D9B65D;
          font-weight: 700;
          white-space: nowrap;
        }

        .topbar-actions button {
          white-space: nowrap;
        }

        /* Téléphone en portrait uniquement */
        @media screen and (max-width: 600px) and (orientation: portrait) {
          .topbar {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            padding: 14px 5%;
          }

          .topbar .brand {
            align-self: flex-start;
          }

          .topbar-actions {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            width: 100%;
            flex: none;
            gap: 10px;
          }

          .topbar-actions .user-welcome {
            grid-column: 1 / -1;
            justify-self: end;
            margin: 0 4px 4px 0;
            padding: 0;
            text-align: right;
          }

          .topbar-actions button {
            width: 100%;
            min-width: 0;
            padding: 10px 6px;
            font-size: 12px;
            white-space: normal;
          }
        }
      `}</style>

      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            closeTrip();
            closeProfile();
          }}
        >
          <span className="brand-icon">A</span>
          <span>
            ADVENTURE<span className="orange">TRAIL</span>
            <small>RIDE · EXPLORE · SHARE</small>
          </span>
        </a>

        <div className="topbar-actions">
          <span className="user-welcome">
            {firstName}
          </span>

          <button
            className="outline-button"
            onClick={openProfile}
          >
            Mon profil
          </button>

          <button
            className="outline-button"
            onClick={handleSignOut}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {showProfile ? (
        <Profile
          user={user}
          onBack={closeProfile}
        />
      ) : selectedTrip ? (
        <Trip
          trip={selectedTrip}
          tripMembers={tripMembers}
          errorMessage={errorMessage}
          editName={editName}
          setEditName={setEditName}
          editLocation={editLocation}
          setEditLocation={setEditLocation}
          savingDetails={savingDetails}
          onSave={saveTripDetails}
          onCreateInvite={createInviteCodeForTrip}
          creatingInvite={saving}
          onBack={closeTrip}
        />
      ) : (
        <Home
          trips={trips}
          firebaseStatus={firebaseStatus}
          errorMessage={errorMessage}
          onCreate={() => setShowCreate(true)}
          onJoin={() => setShowJoin(true)}
          onOpenTrip={openTrip}
        />
      )}

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

            <p>
              Ton aventure sera créée avec ton compte {firstName}.
            </p>

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
              Entre le code transmis par l'organisateur.
            </p>

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

            <p>
              Voici le code à transmettre à tes compagnons :
            </p>

            <div
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                letterSpacing: "6px",
                textAlign: "center",
                padding: "20px",
                color: "#D9B65D",
              }}
            >
              {createdInviteCode}
            </div>

            <button
              className="primary-button full-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(createdInviteCode);
                  setCopyStatus("Code copié !");
                } catch (error) {
                  setCopyStatus(
                    "Copie impossible. Sélectionne le code manuellement."
                  );
                }
              }}
            >
              {copyStatus === "Code copié !"
                ? "✓ Code copié !"
                : "📋 Copier le code"}
            </button>

            {copyStatus && (
              <p style={{ textAlign: "center", color: "#D9B65D" }}>
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
