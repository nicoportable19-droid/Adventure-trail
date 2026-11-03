async function saveProfile(event) {
  event.preventDefault();

  if (!user?.uid || saving) return;

  setSaving(true);
  setError("");
  setMessage("");

  try {
    const bikesToSave = bikes.filter(
      (bike) =>
        bike.make.trim() ||
        bike.model.trim() ||
        bike.capacity.trim()
    );

    // Profil privé : toutes les informations personnelles
    const profileData = {
      pseudo: pseudo.trim(),
      photoURL,
      riding,
      bikes: bikesToSave,
      city: city.trim(),
      region: region.trim(),
      country: country.trim(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(
      doc(db, "users", user.uid),
      profileData,
      { merge: true }
    );

    // Profil public : uniquement les informations visibles
    // par les autres riders
    const publicProfileData = {
      pseudo: pseudo.trim(),
      photoURL,
      riding,
      bikes: bikesToSave,
      region: region.trim(),
      country: country.trim(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(
      doc(db, "publicProfiles", user.uid),
      publicProfileData,
      { merge: true }
    );

    // Modification de l'adresse e-mail
    if (email.trim() && email.trim() !== user.email) {
      await updateEmail(auth.currentUser, email.trim());
    }

    // Modification du mot de passe
    if (newPassword) {
      if (newPassword.length < 6) {
        throw new Error(
          "Le nouveau mot de passe doit contenir au moins 6 caractères."
        );
      }

      if (
        user.providerData.some(
          (provider) => provider.providerId === "password"
        )
      ) {
        if (!currentPassword) {
          throw new Error(
            "Entre ton mot de passe actuel pour le modifier."
          );
        }

        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

        await reauthenticateWithCredential(
          auth.currentUser,
          credential
        );
      }

      await updatePassword(auth.currentUser, newPassword);
    }

    setCurrentPassword("");
    setNewPassword("");

    setMessage(
      "Profil enregistré. Tes informations publiques sont mises à jour !"
    );
  } catch (err) {
    console.error("Enregistrement du profil :", err);

    setError(
      err.message || "Impossible d'enregistrer le profil."
    );
  } finally {
    setSaving(false);
  }
}
