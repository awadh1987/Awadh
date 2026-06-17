import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer, setLogLevel } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

setLogLevel("error");

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId || "ai-studio-57109c31-3ddb-49f9-9f07-feb4961cd427"); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

// Test Connection to Firestore as required by instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
