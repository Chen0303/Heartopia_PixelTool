import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAuNoEWr9HNH76gOhdCkx5kYZ3xE2i6ZU",
  authDomain: "pixel-tool-counter.firebaseapp.com",
  projectId: "pixel-tool-counter",
  storageBucket: "pixel-tool-counter.firebasestorage.app",
  messagingSenderId: "766000208765",
  appId: "1:766000208765:web:c7ad56d3fa925086974a14",
  measurementId: "G-487S1CV6BC"
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);

const db = getFirestore(app);

// visitors document
const visitorRef = doc(db, "stats", "visitors");

export async function incrementVisitor() {
  const snap = await getDoc(visitorRef);

  if (!snap.exists()) {
    await setDoc(visitorRef, { count: 1 });
    return 1;
  }

  await updateDoc(visitorRef, {
    count: increment(1)
  });

  return snap.data().count + 1;
}

export async function getVisitorCount() {
  const snap = await getDoc(visitorRef);

  if (!snap.exists()) return 0;

  return snap.data().count;
}