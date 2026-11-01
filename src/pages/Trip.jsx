import { useState } from "react";
import GpxPage from "./GpxPage";
import MeetingPoint from "./MeetingPoint";
import EquipmentPage from "./EquipmentPage";
import CalendarPage from "./CalendarPage";

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
  onCreateInvite,
  creatingInvite,
  onBack,
}) {
  const [activePage, setActivePage] = useState("home");
  const [copyStatus, setCopyStatus] = useState("");
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  if (activePage === "gpx") {
    return <GpxPage trip={trip} onBack={() => setActivePage("home")} />;
  }

  if (activePage === "map") {
    return <MeetingPoint trip={trip} onBack={() => setActivePage("home")} />;
  }

  if (activePage === "equipment") {
    return (
      <EquipmentPage
        trip={trip}
        tripMembers={tripMembers}
        onBack={() => setActivePage("home")}
      />
    );
  }

  if (activePage === "availability") {
    return (
      <CalendarPage
        trip={trip}
        tripMembers={tripMembers}
        onBack={() => setActivePage("home")}
      />
    );
  }

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(trip.inviteCode);
      setCopyStatus("Code copié !");
    } catch (error) {
      setCopyStatus("Copie impossible. Sélectionne le code manuellement.");
    }
  }

  function cancelDetailsEdit() {
    setEditName(trip.name || "");
    setEditLocation(trip.location || "");
    setIsEditingDetails(false);
  }

  async function saveDetails(event) {
    await onSave(event);
    setIsEditingDetails(false);
  }

  const sections = [
    {
      id: "map",
      icon: "📍",
      title: "Carte & rendez-vous",
      description: "Choisir le lieu de départ et retrouver la carte.",
    },
    {
      id: "gpx",
      icon: "🧭",
      title: "Itinéraire GPS",
      description: "Importer, consulter et partager les parcours GPX.",
    },
    {
      id: "equipment",
      icon: "🎒",
      title: "Matériel",
      description: "Préparer les affaires et répartir le matériel.",
    },
    {
      id: "availability",
      icon: "📅",
      title: "Disponibilités",
      description: "Trouver les dates qui conviennent à l'équipe.",
