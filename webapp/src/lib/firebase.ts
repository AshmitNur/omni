import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCy5l0yEXzvB_JxAclxggjinQViMoIanX0",
  authDomain: "nsu-audit-ff33c.firebaseapp.com",
  projectId: "nsu-audit-ff33c",
  storageBucket: "nsu-audit-ff33c.firebasestorage.app",
  messagingSenderId: "160511112840",
  appId: "1:160511112840:web:ad1835e2d8d431adb2d13d",
  measurementId: "G-2ZE2Y11DWD"
};

// Prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
