          {trip.inviteCode ? (
            <>
              <p>Voici le code à transmettre à tes compagnons :</p>

              <div
                style={{
                  fontSize: "32px",
                  fontWeight: "bold",
                  letterSpacing: "6px",
                  textAlign: "center",
                  padding: "15px",
                  color: "#D9B65D",
                }}
              >
                {trip.inviteCode}
              </div>

              <button
                className="primary-button full-button"
                onClick={copyInviteCode}
              >
                {copyStatus === "Code copié !" ? "✓ Code copié !" : "📋 Copier le code"}
              </button>

              {copyStatus && (
                <p style={{ color: "#D9B65D", marginTop: "10px" }}>
                  {copyStatus}
                </p>
              )}
            </>
          ) : trip.myRole === "owner" ? (
            <>
              <p>
                Cette ancienne aventure n'a pas encore de code enregistré.
              </p>

              <button
                className="primary-button full-button"
                onClick={onCreateInvite}
                disabled={creatingInvite}
              >
                {creatingInvite
                  ? "Création du code..."
                  : "Créer un code d'invitation →"}
              </button>
            </>
          ) : (
            <p>
              Le code d'invitation n'est pas disponible pour cette aventure.
            </p>
          )}
        </div>
      </article>

      <div style={{ marginTop: "40px" }}>
        <span className="eyebrow">ORGANISATION DE L'EXPÉDITION</span>
        <h2>Préparons l'aventure</h2>
        <p className="trip-location">
          Retrouvez ici tous les outils pour organiser votre road trip.
        </p>

        <div className="trip-grid adventure-menu">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="trip-card adventure-menu-card"
              onClick={() => setActivePage(section.id)}
              style={{ textAlign: "left", cursor: "pointer" }}
            >
              <div className="trip-info">
                <span className="adventure-menu-icon">{section.icon}</span>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
                <span className="adventure-menu-link">OUVRIR →</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "40px" }}>
        <span className="eyebrow">L'ÉQUIPE</span>
        <h2>Participants ({tripMembers.length})</h2>

        {tripMembers.length === 0 ? (
          <p>Chargement des participants...</p>
        ) : (
          <div className="trip-grid">
            {tripMembers.map((member) => (
              <article className="trip-card" key={member.id}>
                <div className="trip-info">
                  <h3>👤 {member.firstName || "Rider"}</h3>
                  <p className="trip-location">
                    {member.role === "owner" ? "Organisateur" : "Participant"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
