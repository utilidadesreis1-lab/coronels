import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCS8N1NtSFBr1LQ9vKhjOjNOvOFdYQ4KlE",
  authDomain: "coronels-barbearia.firebaseapp.com",
  projectId: "coronels-barbearia",
  storageBucket: "coronels-barbearia.firebasestorage.app",
  messagingSenderId: "996086201256",
  appId: "1:996086201256:web:7288b5d2a22a127dc33b9d",
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

const getBarbersCollection = () => {
  if (!db) {
    throw new Error("firebase-not-configured");
  }

  return collection(db, "barbers");
};

export {
  addDoc,
  deleteDoc,
  doc,
  db,
  getBarbersCollection,
  getDocs,
  getAppointmentsCollection,
  hasFirebaseConfig,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
};
