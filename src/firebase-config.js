import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// REPLACE THESE with your actual Firebase config values
const firebaseConfig = {
    apiKey: "AIzaSyCmgHC2gFgHSX4jo58DqnXwTh38HUanAVM",
    authDomain: "ecclesiasync-b40f8.firebaseapp.com",
    projectId: "ecclesiasync-b40f8",
    storageBucket: "ecclesiasync-b40f8.firebasestorage.app",
    messagingSenderId: "449008382126",
    appId: "1:449008382126:web:3ad0240a790ccd1205fd3f",
    measurementId: "G-VCKLPVJ04J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
