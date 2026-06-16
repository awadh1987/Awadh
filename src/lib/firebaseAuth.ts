import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google OAuth Provider with Sheets, Drive, & Docs scopes
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/documents");

// Flag to track sign-in process
let isSigningIn = false;

// In-memory and persistent cache for the Google access token
let cachedAccessToken: string | null = localStorage.getItem("erp_google_access_token");

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      localStorage.removeItem("erp_google_access_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google access token from credentials");
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem("erp_google_access_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Firebase Google Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign up with Email and Password
export const signUpWithEmailAndPassword = async (
  email: string, 
  password: string, 
  displayName: string
): Promise<User> => {
  try {
    isSigningIn = true;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName });
    return user;
  } catch (error: any) {
    console.error("Firebase Sign-Up Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Sign in with Email and Password
export const signInWithEmailAndPassword = async (
  email: string, 
  password: string
): Promise<User> => {
  try {
    isSigningIn = true;
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error("Firebase Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve token from memory
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Log out
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem("erp_google_access_token");
};
