import { useState, useEffect, useMemo } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
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
getDocs,
setDoc,
updateDoc,
deleteDoc,
} from "firebase/firestore";

import Home from "./pages/Home";
import Trip from "./pages/Trip";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import PublicProfile from "./pages/PublicProfile";

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
    const navigate = useNavigate();
  const location = useLocation();
const [user, setUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const [authPage, setAuthPage] = useState("login");

const [createdInviteCode, setCreatedInviteCode] = useState("");
const [copyStatus, setCopyStatus] = useState("");

const [ownerTrips, setOwnerTrips] = useState([]);
const [joinedTrips, setJoinedTrips] = useState([]);

const [participantCounts, setParticipantCounts] = useState({});

const [firebaseStatus, setFirebaseStatus] = useState("Connexion...");
const [errorMessage, setErrorMessage] = useState("");

const [showCreate, setShowCreate] = useState(false);
const [showJoin, setShowJoin] = useState(false);
const [showProfile, setShowProfile] = useState(false);
const [showCommunity, setShowCommunity] = useState(false);

const [publicProfileId, setPublicProfileId] = useState(null);
const [profileReturnPage, setProfileReturnPage] = useState("home");

const [tripName, setTripName] = useState("");
const [tripLocation, setTripLocation] = useState("");
const [inviteCode, setInviteCode] = useState("");

// Listes favorites de matériel
const [equipmentLists, setEquipmentLists] = useState([]);
const [selectedEquipmentListId, setSelectedEquipmentListId] = useState("");

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
  new Map(
    allTrips.map((trip) => [trip.id, trip])
  ).values()
);

}, [ownerTrips, joinedTrips]);

// Nombre réel des participants
useEffect(() => {
if (!userId || trips.length === 0) {
setParticipantCounts({});
return;
}

const unsubscribers = trips.map((trip) =>
  onSnapshot(
    collection(db, "trips", trip.id, "members"),
    (snapshot) => {
      setParticipantCounts((current) => ({
        ...current,
        [trip.id]: snapshot.size,
      }));
    },
    (error) => {
      console.error(
        "Lecture du nombre de participants :",
        error
      );
    }
  )
);

return () => {
  unsubscribers.forEach((unsubscribe) => unsubscribe());
};

}, [userId, trips]);

// Connexion Firebase
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
    setShowCommunity(false);
    setPublicProfileId(null);
    setProfilePseudo("");
    setEquipmentLists([]);
    setSelectedEquipmentListId("");
    setParticipantCounts({});
  }
});

return () => unsubscribe();

}, []);

// Profil personnel et listes favorites de matériel
useEffect(() => {
if (!userId) {
setProfilePseudo("");
setEquipmentLists([]);
setSelectedEquipmentListId("");
return;
}

const profileRef = doc(db, "users", userId);

const unsubscribe = onSnapshot(
  profileRef,
  (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();

      setProfilePseudo(data.pseudo || "");

      const lists = Array.isArray(data.equipmentLists)
        ? data.equipmentLists
        : [];

      setEquipmentLists(lists);

      setSelectedEquipmentListId((current) => {
        if (current && lists.some((list) => list.id === current)) {
          return current;
        }

        return "";
      });
    } else {
      setProfilePseudo("");
      setEquipmentLists([]);
      setSelectedEquipmentListId("");
    }
  },
  (error) => {
    console.error("Lecture du profil :", error);
  }
);

return () => unsubscribe();

}, [userId]);

// Aventures créées et rejointes
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

    setErrorMessage(
      "Lecture aventures créées : " + error.message
    );
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

      setErrorMessage(
        "Lecture d'une aventure : " + error.message
      );
    }
  },
  (error) => {
    console.error("Lecture des participations :", error);

    setErrorMessage(
      "Lecture des participations : " + error.message
    );
  }
);

return () => {
  cancelled = true;

  if (unsubscribeOwner) unsubscribeOwner();
  if (unsubscribeMembers) unsubscribeMembers();
};

}, [userId]);

// Mise à jour de l'aventure ouverte et de ses membres
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

// Ouvrir une aventure
function openTrip(trip) {
setSelectedTrip(trip);
setEditName(trip.name || "");
setEditLocation(trip.location || "");
setErrorMessage("");
setTripMembers([]);

setShowProfile(false);
setShowCommunity(false);
setPublicProfileId(null);

}

// Fermer une aventure
function closeTrip() {
setSelectedTrip(null);
setTripMembers([]);
setErrorMessage("");

setShowCommunity(false);
setPublicProfileId(null);

}

// Supprimer une aventure créée par l'utilisateur
async function deleteTrip(trip) {
if (!trip || !userId || trip.ownerId !== userId) {
alert("Seul l'organisateur peut supprimer cette aventure.");
return;
}

const confirmed = window.confirm(
  `Veux-tu vraiment supprimer l'aventure "${trip.name}" ? Cette action est définitive.`
);

if (!confirmed) return;

if (saving) return;

setSaving(true);
setErrorMessage("");

try {
  // Supprimer les documents des participants
  const membersRef = collection(
    db,
    "trips",
    trip.id,
    "members"
  );

  const membersSnapshot = await getDocs(membersRef);

  await Promise.all(
    membersSnapshot.docs.map((member) =>
      deleteDoc(member.ref)
    )
  );

  // Supprimer le code d'invitation
  if (trip.inviteCode) {
    await deleteDoc(
      doc(db, "invites", trip.inviteCode)
    );
  }

  // Supprimer l'aventure
  await deleteDoc(
    doc(db, "trips", trip.id)
  );

  if (selectedTrip?.id === trip.id) {
    closeTrip();
  }

  setParticipantCounts((current) => {
    const updated = { ...current };
    delete updated[trip.id];
    return updated;
  });

  alert("L'aventure a bien été supprimée !");
} catch (error) {
  console.error("Suppression de l'aventure :", error);

  setErrorMessage(
    "Impossible de supprimer l'aventure : " + error.message
  );

  alert(
    "Impossible de supprimer l'aventure : " + error.message
  );
} finally {
  setSaving(false);
}

}

// Ouvrir le profil personnel
function openProfile() {
setSelectedTrip(null);
setTripMembers([]);

setShowProfile(true);
setShowCommunity(false);
setPublicProfileId(null);
setErrorMessage("");

}

// Fermer le profil personnel
function closeProfile() {
setShowProfile(false);
}

// Ouvrir la communauté
function openCommunity() {
setSelectedTrip(null);
setTripMembers([]);

setShowProfile(false);
setPublicProfileId(null);
setShowCommunity(true);
setErrorMessage("");

}

// Ouvrir un profil public
function openPublicProfile(uid, returnPage = "home") {
if (!uid) return;

setProfileReturnPage(returnPage);
setPublicProfileId(uid);
setShowProfile(false);
setErrorMessage("");

}

// Retour du profil public
function closePublicProfile() {
setPublicProfileId(null);
}

// Déconnexion
async function handleSignOut() {
try {
await signOut(auth);

  closeTrip();
  closeProfile();

  setShowCommunity(false);
  setPublicProfileId(null);

  setCreatedInviteCode("");
  setShowCreate(false);
  setShowJoin(false);

  setAuthPage("login");
} catch (error) {
  console.error(error);

  setErrorMessage(
    "Impossible de se déconnecter : " + error.message
  );
}

}

// Créer un road trip
async function createTrip(event) {
event.preventDefault();

if (!tripName.trim() || !userId || saving) return;

setSaving(true);
setErrorMessage("");

try {
  // Récupérer la liste favorite sélectionnée
  const selectedEquipmentList = equipmentLists.find(
    (list) => list.id === selectedEquipmentListId
  );

  // Copier uniquement les équipements cochés
  const equipmentPreset = selectedEquipmentList
    ? {
        listId: selectedEquipmentList.id,
        listName: selectedEquipmentList.name,
        items: (selectedEquipmentList.items || [])
          .filter(
            (item) => item.selected && item.name?.trim()
          )
          .map((item) => ({
            name: item.name.trim(),
            category: item.category || "Matériel ajouté",
          })),
      }
    : null;

  let code;

  do {
    code = generateInviteCode();
  } while (
    (await getDoc(doc(db, "invites", code))).exists()
  );

  const tripRef = await addDoc(
    collection(db, "trips"),
    {
      ownerId: userId,
      name: tripName.trim(),
      location:
        tripLocation.trim() || "Destination à définir",
      dates: "Dates à définir",
      participants: 1,
      status: "Préparation",
      icon: "🏍️",
      inviteCode: code,
      equipmentPreset,
      createdAt: serverTimestamp(),
    }
  );

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
  setSelectedEquipmentListId("");
  setShowCreate(false);

  setCreatedInviteCode(code);
  setCopyStatus("");
} catch (error) {
  console.error(error);

  setErrorMessage(error.message);

  alert(
    "Impossible de créer le road trip : " + error.message
  );
} finally {
  setSaving(false);
}

}

// Créer un code pour une ancienne aventure
async function createInviteCodeForTrip() {
if (
!selectedTrip ||
selectedTrip.myRole !== "owner" ||
saving
) {
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
async function joinTrip(event) {
event.preventDefault();

if (!inviteCode.trim() || !userId || saving) return;

setSaving(true);
setErrorMessage("");

try {
  const code = inviteCode.trim().toUpperCase();

  const inviteSnapshot = await getDoc(
    doc(db, "invites", code)
  );

  if (!inviteSnapshot.exists()) {
    throw new Error(
      "Ce code d'invitation est introuvable."
    );
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

  const tripSnapshot = await getDoc(
    doc(db, "trips", tripId)
  );

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

  alert(
    "Impossible de rejoindre le voyage : " + error.message
  );
} finally {
  setSaving(false);
}

}

// Enregistrer les modifications d'une aventure
async function saveTripDetails(event) {
event.preventDefault();

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
    location:
      editLocation.trim() || "Destination à définir",
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
<Register
onGoToLogin={() => setAuthPage("login")}
/>
) : (
<Login
onGoToRegister={() => setAuthPage("register")}
/>
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

    /* Modale de création - thème Adventure Trail */
    .create-trip-modal {
      width: min(540px, calc(100vw - 32px));
      max-height: min(88vh, 820px);
      overflow-y: auto;
      padding: 34px;
      border: 1px solid rgba(217,182,93,.28);
      border-radius: 20px;
      color: #f2eee4;
      background:
        radial-gradient(circle at 100% 0%, rgba(217,182,93,.13), transparent 38%),
        linear-gradient(145deg, #22231e, #151612 78%);
      box-shadow: 0 28px 90px rgba(0,0,0,.68);
    }

    .create-trip-modal .eyebrow {
      color: #d9b65d;
      letter-spacing: 2px;
    }

    .create-trip-modal h2 {
      margin: 12px 0 8px;
      color: #f5f0e5;
    }

    .create-trip-modal > p {
      color: #aaa99f;
      line-height: 1.6;
    }

    .create-trip-modal label {
      display: block;
      margin: 20px 0 8px;
      color: #e5c878;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .7px;
      text-transform: uppercase;
    }

    .create-trip-modal input {
      width: 100%;
      box-sizing: border-box;
      min-height: 48px;
      padding: 0 14px;
      border: 1px solid #49493e;
      border-radius: 10px;
      outline: none;
      background: #25261f;
      color: #f4efe3;
      font: inherit;
      transition: border-color .2s, box-shadow .2s;
    }

    .create-trip-modal input::placeholder {
      color: #77776d;
    }

    .create-trip-modal input:focus {
      border-color: #d9b65d;
      box-shadow: 0 0 0 3px rgba(217,182,93,.12);
    }

    .equipment-choice-list {
      display: grid;
      gap: 9px;
      margin-top: 10px;
    }

    .equipment-choice {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 13px 14px;
      border: 1px solid #414238;
      border-radius: 12px;
      color: #e9e5da;
      background: rgba(255,255,255,.025);
      text-align: left;
      cursor: pointer;
      transition: border-color .18s, background .18s, transform .18s;
    }

    .equipment-choice:hover {
      border-color: rgba(217,182,93,.55);
      background: rgba(217,182,93,.06);
      transform: translateY(-1px);
    }

    .equipment-choice.is-selected {
      border-color: #d9b65d;
      background: rgba(217,182,93,.12);
      box-shadow: inset 0 0 0 1px rgba(217,182,93,.16);
    }

    .equipment-choice-icon {
      display: grid;
      place-items: center;
      flex: 0 0 38px;
      height: 38px;
      border: 1px solid rgba(217,182,93,.25);
      border-radius: 10px;
      color: #e4c36d;
      background: rgba(217,182,93,.08);
      font-size: 17px;
    }

    .equipment-choice-copy {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .equipment-choice-name {
      overflow-wrap: anywhere;
      font-weight: 750;
    }

    .equipment-choice-meta {
      color: #99998e;
      font-size: 12px;
    }

    .equipment-choice-check {
      display: grid;
      place-items: center;
      flex: 0 0 22px;
      height: 22px;
      border: 1px solid #626154;
      border-radius: 50%;
      color: transparent;
      font-size: 12px;
    }

    .equipment-choice.is-selected .equipment-choice-check {
      border-color: #d9b65d;
      color: #191a15;
      background: #d9b65d;
    }

    .equipment-choice-hint {
      margin: 10px 0 20px !important;
      color: #99998e !important;
      font-size: 12px;
    }

    .create-trip-modal .primary-button {
      min-height: 50px;
      border-radius: 10px;
    }

    .create-trip-modal .modal-close {
      color: #d8d2c3;
    }

    @media (max-width: 600px) {
      .create-trip-modal {
        padding: 27px 20px;
      }
    }

    @media screen and (max-width: 650px) {
      .topbar {
        height: auto;
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
      onClick={(event) => {
        event.preventDefault();

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

  {/* AFFICHAGE DES PAGES */}
  {showProfile ? (
    <Profile
      user={user}
      onBack={closeProfile}
    />
  ) : publicProfileId ? (
    <PublicProfile
      userId={publicProfileId}
      onBack={closePublicProfile}
    />
  ) : showCommunity ? (
    <Community
      onBack={() => setShowCommunity(false)}
      onOpenProfile={(uid) =>
        openPublicProfile(uid, "community")
      }
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
      userId={userId}
      onCreateInvite={createInviteCodeForTrip}
      creatingInvite={saving}
      onOpenProfile={(uid) =>
        openPublicProfile(uid, "trip")
      }
      onBack={closeTrip}
    />
  ) : (
    <Home
      trips={trips}
      participantCounts={participantCounts}
      firebaseStatus={firebaseStatus}
      errorMessage={errorMessage}
      onCreate={() => setShowCreate(true)}
      onJoin={() => setShowJoin(true)}
      onOpenTrip={openTrip}
      onOpenCommunity={openCommunity}
      onDeleteTrip={deleteTrip}
    />
  )}

  <footer>
    <span>ADVENTURE TRAIL</span>
    <span>FAITES DE LA ROUTE UNE AVENTURE.</span>
    <span>© 2026</span>
  </footer>

  {/* MODALE CRÉATION */}
  {showCreate && (
    <div
      className="modal-backdrop"
      onClick={() => setShowCreate(false)}
    >
      <form
        className="modal create-trip-modal"
        onSubmit={createTrip}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={() => setShowCreate(false)}
        >
          ×
        </button>

        <span className="eyebrow">
          NOUVELLE EXPÉDITION
        </span>

        <h2>Créer un road trip</h2>

        <p>
          Ton aventure sera créée avec ton compte {firstName}.
        </p>

        <label>Nom de l'aventure</label>

        <input
          value={tripName}
          onChange={(event) =>
            setTripName(event.target.value)
          }
          placeholder="Ex. : Tour des Pyrénées"
          required
        />

        <label>Destination</label>

        <input
          value={tripLocation}
          onChange={(event) =>
            setTripLocation(event.target.value)
          }
          placeholder="Ex. : France · Pyrénées"
        />

        <label>
          Liste de matériel à utiliser
        </label>

        <div
          className="equipment-choice-list"
          role="radiogroup"
          aria-label="Liste de matériel"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!selectedEquipmentListId}
            className={`equipment-choice ${
              !selectedEquipmentListId ? "is-selected" : ""
            }`}
            onClick={() => setSelectedEquipmentListId("")}
          >
            <span className="equipment-choice-icon">—</span>

            <span className="equipment-choice-copy">
              <span className="equipment-choice-name">
                Aucune liste favorite
              </span>

              <span className="equipment-choice-meta">
                Partir sans modèle de matériel
              </span>
            </span>

            <span className="equipment-choice-check">
              ✓
            </span>
          </button>

          {equipmentLists.map((list) => {
            const selectedCount = (list.items || []).filter(
              (item) => item.selected
            ).length;

            const isSelected =
              selectedEquipmentListId === list.id;

            return (
              <button
                key={list.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`equipment-choice ${
                  isSelected ? "is-selected" : ""
                }`}
                onClick={() =>
                  setSelectedEquipmentListId(list.id)
                }
              >
                <span className="equipment-choice-icon">
                  🎒
                </span>

                <span className="equipment-choice-copy">
                  <span className="equipment-choice-name">
                    {list.name}
                  </span>

                  <span className="equipment-choice-meta">
                    {selectedCount} équipement
                    {selectedCount > 1 ? "s" : ""} sélectionné
                    {selectedCount > 1 ? "s" : ""}
                  </span>
                </span>

                <span className="equipment-choice-check">
                  ✓
                </span>
              </button>
            );
          })}
        </div>

        <p className="equipment-choice-hint">
          Seuls les équipements cochés dans la liste choisie
          seront copiés dans ton aventure.
        </p>

        <button
          className="primary-button full-button"
          type="submit"
          disabled={saving || !userId}
        >
          {saving
            ? "Enregistrement..."
            : "Créer l'aventure →"}
        </button>
      </form>
    </div>
  )}

  {/* MODALE REJOINDRE */}
  {showJoin && (
    <div
      className="modal-backdrop"
      onClick={() => setShowJoin(false)}
    >
      <form
        className="modal"
        onSubmit={joinTrip}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={() => setShowJoin(false)}
        >
          ×
        </button>

        <span className="eyebrow">
          REJOINDRE UNE ÉQUIPE
        </span>

        <h2>Bienvenue, rider !</h2>

        <p>
          Entre le code transmis par l'organisateur.
        </p>

        <label>Code d'invitation</label>

        <input
          value={inviteCode}
          onChange={(event) =>
            setInviteCode(event.target.value.toUpperCase())
          }
          placeholder="Colle ton code ici"
          required
        />

        <button
          className="primary-button full-button"
          type="submit"
          disabled={saving || !userId}
        >
          {saving
            ? "Connexion..."
            : "Rejoindre le road trip →"}
        </button>
      </form>
    </div>
  )}

  {/* MODALE CODE D'INVITATION */}
  {createdInviteCode && (
    <div className="modal-backdrop">
      <div className="modal">
        <span className="eyebrow">
          INVITATION PRÊTE
        </span>

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
              await navigator.clipboard.writeText(
                createdInviteCode
              );

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
          <p
            style={{
              textAlign: "center",
              color: "#D9B65D",
            }}
          >
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
