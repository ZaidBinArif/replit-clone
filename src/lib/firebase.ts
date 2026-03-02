import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// ============================================
// Firebase Config
// ============================================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Initialize Firebase (lazy, client-side only)
function getApp() {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) return null;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

function getAuthInstance() {
  const app = getApp();
  return app ? getAuth(app) : null;
}

function getDbInstance() {
  const app = getApp();
  return app ? getFirestore(app) : null;
}

const googleProvider = new GoogleAuthProvider();

// ============================================
// Auth Functions
// ============================================

export async function signInWithGoogle() {
  const auth = getAuthInstance();
  if (!auth) throw new Error("Firebase not configured. Add your Firebase config to .env.local");

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save user profile to Firestore on first login
    const database = getDbInstance();
    if (database) {
      const userRef = doc(database, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
        });
      }
    }

    return user;
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

export async function signOut() {
  const auth = getAuthInstance();
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  const auth = getAuthInstance();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// ============================================
// Firestore: Projects
// ============================================

/**
 * Save a project to Firestore.
 * We strip file content for the main document and store files separately
 * to stay within Firestore's 1MB document limit.
 */
export async function saveProject(project: {
  id: string;
  userId: string;
  title: string;
  framework: string;
  createdAt: number;
  updatedAt: number;
  files: Record<string, any>;
  messages: Array<any>;
  contextState: {
    tierA_summary: string;
    tierA_coversUpTo: number;
    tierB_startFrom: number;
  };
}) {
  const database = getDbInstance();
  if (!database) return;

  try {
    const projectRef = doc(database, "projects", project.id);

    // Truncate large assistant messages to avoid exceeding Firestore 1MB limit
    const trimmedMessages = project.messages.map((msg: any) => {
      if (msg.role === "assistant" && msg.content && msg.content.length > 50000) {
        return { ...msg, content: msg.content.substring(0, 50000) + "\n[truncated for storage]" };
      }
      return msg;
    });

    // Trim file content if too large (keep first 100KB per file)
    const trimmedFiles: Record<string, any> = {};
    for (const [path, file] of Object.entries(project.files)) {
      const f = file as any;
      trimmedFiles[path] = {
        path: f.path,
        content: f.content && f.content.length > 100000
          ? f.content.substring(0, 100000) + "\n// [truncated for storage]"
          : f.content,
        language: f.language,
        lastEdited: f.lastEdited || Date.now(),
      };
    }

    await setDoc(
      projectRef,
      {
        id: project.id,
        userId: project.userId,
        title: project.title,
        framework: project.framework,
        createdAt: project.createdAt,
        files: trimmedFiles,
        messages: trimmedMessages,
        contextState: project.contextState,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error saving project to Firestore:", error);
  }
}

export async function loadUserProjects(userId: string) {
  const database = getDbInstance();
  if (!database) return [];
  try {
    const q = query(
      collection(database, "projects"),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (error: any) {
    // Firestore composite index might not exist yet — fall back to unordered query
    if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
      console.warn("[Firestore] Index missing, falling back to unordered query");
      try {
        const fallbackQ = query(
          collection(database, "projects"),
          where("userId", "==", userId)
        );
        const snapshot = await getDocs(fallbackQ);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (fallbackErr) {
        console.error("Fallback query also failed:", fallbackErr);
        return [];
      }
    }
    console.error("Error loading projects from Firestore:", error);
    return [];
  }
}

export async function deleteProjectFromDB(projectId: string) {
  const database = getDbInstance();
  if (!database) return;
  try {
    await deleteDoc(doc(database, "projects", projectId));
  } catch (error) {
    console.error("Error deleting project from Firestore:", error);
  }
}

export { getAuthInstance, getDbInstance };
