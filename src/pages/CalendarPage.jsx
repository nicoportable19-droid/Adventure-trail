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

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function CalendarPage({ trip, tripMembers = [], onBack }) {
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
  const [availability, setAvailability] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentUid = auth.currentUser?.uid;

  useEffect(() => {
    if (!trip?.id) return undefined;

    const availabilityRef = collection(
      db,
      "trips",
      trip.id,
      "availability"
    );

    const unsubscribe = onSnapshot(
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

    return unsubscribe;
  }, [trip?.id]);

  const myDates = availability[currentUid]?.dates || [];

  const calendarDays = useMemo(() => {
    const first = startOfMonth(displayMonth);
    const mondayOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return {
        date,
        key: dateKey(date),
        inMonth: date.getMonth() === displayMonth.getMonth(),
      };
    });
  }, [displayMonth]);

  const memberCount = Math.max(tripMembers.length, 1);

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

  function changeMonth(offset) {
    setDisplayMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  const monthLabel = displayMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="calendar-page">
      <button className="text-button" onClick={onBack}>
        ← Retour à l'aventure
      </button>

      <header className="calendar-heading">
        <span className="eyebrow">ORGANISATION DE L'EXPÉDITION</span>
        <h2>Disponibilités</h2>
        <p className="trip-location">
          Sélectionne les jours où tu peux participer. Les dates communes
          apparaîtront automatiquement.
        </p>
      </header>

      {error && <p className="calendar-error">{error}</p>}

      <article className="calendar-card">
        <div className="calendar-toolbar">
          <button
            type="button"
            className="calendar-nav"
            onClick={() => changeMonth(-1)}
            aria-label="Mois précédent"
          >
            ‹
          </button>
          <h3>{monthLabel}</h3>
          <button
            type="button"
            className="calendar-nav"
            onClick={() => changeMonth(1)}
            aria-label="Mois suivant"
          >
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {WEEKDAYS.map((day) => (
            <div className="calendar-weekday" key={day}>{day}</div>
          ))}

          {calendarDays.map(({ date, key, inMonth }) => {
            const availableMembers = Object.values(availability).filter(
              (member) => member.dates.includes(key)
            );
            const isMine = myDates.includes(key);
            const isCommon =
              tripMembers.length > 0 &&
              availableMembers.length === tripMembers.length;

            return (
              <button
                type="button"
                key={key}
                className={[
                  "calendar-day",
                  !inMonth ? "outside-month" : "",
                  isMine ? "my-availability" : "",
                  isCommon ? "common-availability" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => toggleDate(key)}
                disabled={!currentUid || saving}
                title={`${availableMembers.length} participant(s) disponible(s)`}
              >
                <span>{date.getDate()}</span>
                {availableMembers.length > 0 && (
                  <small>{availableMembers.length}/{memberCount}</small>
                )}
              </button>
            );
          })}
        </div>

        <div className="calendar-legend">
          <span><i className="legend-dot mine" /> Mes disponibilités</span>
          <span><i className="legend-dot common" /> Toute l'équipe</span>
        </div>

        <p className="calendar-help">
          Appuie sur une date pour indiquer ou retirer ta disponibilité.
          {saving ? " Enregistrement…" : " Enregistrement automatique."}
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
