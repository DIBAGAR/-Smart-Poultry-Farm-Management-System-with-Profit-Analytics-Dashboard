import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

export const firebaseConfig = {
    apiKey: "AIzaSyBAc1rzlPwX_d_0g4geehNWkuYriG5UelI",
    authDomain: "my-cloud-webapp-8eead.firebaseapp.com",
    projectId: "my-cloud-webapp-8eead",
    storageBucket: "my-cloud-webapp-8eead.firebasestorage.app",
    messagingSenderId: "459385966902",
    appId: "1:459385966902:web:6f265711b9c8ac74c7e397",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
