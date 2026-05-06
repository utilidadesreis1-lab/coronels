import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "coronels-barbearia",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.trim() !== ""
);

let app = null;
let db = null;

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

const getAppointmentsCollection = () => {
  if (!db) {
    throw new Error("firebase-not-configured");
  }

  return collection(db, "appointments");
};

export {
  addDoc,
  deleteDoc,
  doc,
  db,
  getAppointmentsCollection,
  hasFirebaseConfig,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
};
