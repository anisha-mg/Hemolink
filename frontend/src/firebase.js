import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAE4cWGxo-DbcLwhi-P6XZ1rvcug1Y6E_U",
  authDomain: "hemo-link-a2802.firebaseapp.com",
  projectId: "hemo-link-a2802",
  storageBucket: "hemo-link-a2802.firebasestorage.app",
  messagingSenderId: "79064762597",
  appId: "1:79064762597:web:0cc2ee4e1cc08eacab2c0c",
  measurementId: "G-TDNNK3SBQW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper function to setup invisible reCAPTCHA for Phone Auth
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
      }
    });
  }
  return window.recaptchaVerifier;
}

// Send OTP to phone number (+91XXXXXXXXXX)
export async function sendPhoneOTP(phoneNumber, containerId = 'recaptcha-container') {
  try {
    const verifier = setupRecaptcha(containerId);
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    window.confirmationResult = confirmationResult;
    return { success: true, confirmationResult };
  } catch (error) {
    console.error("Firebase Phone Auth error:", error);
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    return { success: false, error: error.message };
  }
}

// Verify received SMS OTP code
export async function verifyPhoneOTP(otpCode) {
  try {
    if (!window.confirmationResult) {
      throw new Error("No active OTP session found. Please request OTP first.");
    }
    const result = await window.confirmationResult.confirm(otpCode);
    return { success: true, user: result.user };
  } catch (error) {
    console.error("OTP verification error:", error);
    return { success: false, error: error.message };
  }
}

export default app;
