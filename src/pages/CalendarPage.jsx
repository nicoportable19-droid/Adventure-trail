import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./CalendarPage.css";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();

  return [
    ...Array(offset).fill(null),
    ...Array.from({ length: count }, (_, index) => new Date(year, month, index + 1)),
  ];
}

function availabilityClass(key, availability, currentUid, teamUids) {
  const available = Object.values(availability).filter((member) =>
    member.dates.includes(key)
  );
  const hasMe = available.some((member) => member.uid === currentUid);
  const allTeamAvailable =
    teamUids.length > 0 &&
    teamUids.every((uid) =>
      available.some((member) => member.uid === uid)
    );

  if (allTeamAvailable) return "common-availability";
  if (hasMe) return "my-availability";
  if (available.length > 0) return "team-availability";
  return "";
}

export default function CalendarPage({ trip, tripMembers = [], onBack }) {
  const [displayDate, setDisplayDate] = useState(() => new Date());
  const [view, setView] = useState("month");
  const [availability, setAvailability] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!trip?.id) return undefined;

    const availabilityRef = collection(db, "trips", trip.id, "availability");
    return onSnapshot(
      availabilityRef,
      (snapshot) => {
        const next = {};
        snapshot.forEach((item) => {
          next[item.id] = {
            uid: item.data().uid || item.id,
            firstName: item.data().firstName || "Rider",
            dates: Array.isArray(item.data().dates) ? item.data().dates : [],
          };
        });
        setAvailability(next);
        setError("");
      },
      (firebaseError) => {
        console.error("Lecture des disponibilités :", firebaseError);
        setError("Impossible de charger les disponibilités : " + firebaseError.message);
      }
    );
  }, [trip?.id]);

  const myDates = availability[currentUid]?.dates || [];

  const teamUids = useMemo(() => {
    const ids = tripMembers.map((member) => member.uid).filter(Boolean);
    if (currentUid && !ids.includes(currentUid)) ids.push(currentUid);
    return [...new Set(ids)];
  }, [tripMembers, currentUid]);

  async function toggleDate(key) {
    if (!currentUid || saving) return;

    const nextDates = myDates.includes(key)
      ? myDates.filter((date) => date !== key)
      : [...myDates, key].sort();

    setSaving(true);
    setError("");
    try {
      const myMember = tripMembers.find((member) => member.uid === currentUid);
      await setDoc(
        doc(db, "trips", trip.id, "availability", currentUid),
        {
          uid: currentUid,
          firstName: myMember?.firstName || "Rider",
          dates: nextDates,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (firebaseError) {
      console.error("Enregistrement des disponibilités :", firebaseError);
      setError("Enregistrement impossible : " + firebaseError.message);
    } finally {
      setSaving(false);
    }
  }

  function movePeriod(amount) {
    setDisplayDate((current) =>
      view === "month"
        ? new Date(current.getFullYear(), current.getMonth() + amount, 1)
        : new Date(current.getFullYear() + amount, current.getMonth(), 1)
    );
  }

  function changeView(nextView) {
    setView(nextView);
  }

  const monthLabel = displayDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  function renderMonthGrid(year, month, compact = false) {
    const days = getMonthDays(year, month);
    return (
      <div className={`calendar-grid ${compact ? "calendar-grid-compact" : ""}`}>
        {WEEKDAYS.map((day, index) => (
          <div className="calendar-weekday" key={`${day}-${index}`}>{day}</div>
        ))}
        {days.map((date, index) => {
          if (!date) return <span className="calendar-empty" key={`empty-${index}`} />;
          const key = dateKey(date);
          const statusClass = availabilityClass(key, availability, currentUid, teamUids);
          const isMine = myDates.includes(key);

          return (
            <button
              type="button"
              key={key}
              className={`calendar-day ${statusClass}`}
              onClick={() => toggleDate(key)}
              disabled={!currentUid || saving}
              title={`${date.toLocaleDateString("fr-FR")} : ${
                Object.values(availability)
                  .filter((member) => member.dates.includes(key))
                  .map((member) => member.firstName)
                  .join(", ") || "Aucune disponibilité"
              }${isMine ? " — ta disponibilité" : ""}`}
              aria-label={`${date.getDate()} ${date.toLocaleDateString("fr-FR", { month: "long" })}`}
            >
              <span>{date.getDate()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section className="calendar-page">
      <button className="text-button" onClick={onBack}>
        ← Retour à l'aventure
      </button>

      <header className="calendar-heading">
        <span className="eyebrow">ORGANISATION DE L'EXPÉDITION</span>
        <h2>Disponibilités</h2>
        <p className="trip-location">
          Chaque participant voit les disponibilités de toute l'équipe.
          Appuie sur une date pour ajouter ou retirer ta propre disponibilité.
        </p>
      </header>

      {error && <p className="calendar-error">{error}</p>}

      <article className="calendar-card">
        <div className="calendar-controls">
          <div className="calendar-view-switch">
            <button
              type="button"
              className={view === "month" ? "selected" : ""}
              onClick={() => changeView("month")}
            >
              Mensuel
            </button>
            <button
              type="button"
              className={view === "year" ? "selected" : ""}
              onClick={() => changeView("year")}
            >
              Annuel
            </button>
          </div>

          <div className="calendar-toolbar">
            <button
              type="button"
              className="calendar-nav"
              onClick={() => movePeriod(-1)}
              aria-label={view === "month" ? "Mois précédent" : "Année précédente"}
            >
              ‹
            </button>
            <h3>
              {view === "month"
                ? monthLabel
                : displayDate.getFullYear()}
            </h3>
            <button
              type="button"
              className="calendar-nav"
              onClick={() => movePeriod(1)}
              aria-label={view === "month" ? "Mois suivant" : "Année suivante"}
            >
              ›
            </button>
          </div>
        </div>

        {view === "month" ? (
          renderMonthGrid(displayDate.getFullYear(), displayDate.getMonth())
        ) : (
          <div className="calendar-year-grid">
            {Array.from({ length: 12 }, (_, month) => (
              <section className="calendar-mini-month" key={month}>
                <button
                  type="button"
                  className="calendar-mini-title"
                  onClick={() => {
                    setDisplayDate(new Date(displayDate.getFullYear(), month, 1));
                    setView("month");
                  }}
                >
                  {new Date(displayDate.getFullYear(), month, 1)
                    .toLocaleDateString("fr-FR", { month: "long" })}
                </button>
                {renderMonthGrid(displayDate.getFullYear(), month, true)}
              </section>
            ))}
          </div>
        )}

        <div className="calendar-legend">
          <span><i className="legend-dot team" /> Un ou plusieurs membres</span>
          <span><i className="legend-dot mine" /> Mes disponibilités</span>
          <span><i className="legend-dot common" /> Toute l'équipe</span>
        </div>

        <p className="calendar-help">
          {view === "year"
            ? "Vue annuelle : touche un jour pour sélectionner ta disponibilité, ou le nom d'un mois pour l'agrandir."
            : "Touche les jours où tu es disponible. Les changements sont enregistrés automatiquement."}
          {saving ? " Enregistrement…" : ""}
        </p>
      </article>

      <article className="calendar-card calendar-members">
        <h3>Disponibilités de l'équipe</h3>
        {tripMembers.length === 0 ? (
          <p>Chargement des participants…</p>
        ) : (
          tripMembers.map((member) => {
            const dates = availability[member.uid]?.dates || [];
            return (
              <div className="calendar-member-row" key={member.id || member.uid}>
                <strong>{member.firstName || "Rider"}</strong>
                <span>{dates.length} jour(s) sélectionné(s)</span>
              </div>
            );
          })
        )}
      </article>
    </section>
  );
}
