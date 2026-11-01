import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCdc0vVQmEtXtkXlaUSkJ5O0ZBv3A",
  authDomain: "adventure-trail-2727d.firebaseapp.com",
  projectId: "adventure-trail-2727d",
  storageBucket: "adventure-trail-2727d.firebasestorage.app",
  messagingSenderId: "131744235052",
  appId: "1:131744235052:web:541b5276485e14a99a5b89"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
