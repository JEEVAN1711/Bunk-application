// Firebase Phone Authentication Service (Google 10,000 Free SMS/Month)
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';

// Your Firebase Config (can be loaded via environment variables or direct config)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDEMO_KEY_REPLACE_WITH_YOURS",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bunk-station.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bunk-station",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bunk-station.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Keep active confirmation result in memory
let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // ignore
    }
  }

  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('reCAPTCHA solved');
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired');
    }
  });

  return recaptchaVerifier;
}

/**
 * Send real-time SMS to phone number using Google Firebase Phone Auth
 */
export async function sendFirebasePhoneOtp(phoneNumber: string, containerId: string = 'recaptcha-container'): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/\D/g, '').slice(-10)}`;
    const verifier = setupRecaptcha(containerId);
    confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
    return { success: true };
  } catch (err: any) {
    console.error('Firebase Phone Auth Error:', err);
    return { success: false, error: err.message || 'Failed to send SMS via Google Firebase' };
  }
}

/**
 * Verify 6-digit OTP entered by user against Google Firebase
 */
export async function verifyFirebaseOtp(otpCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!confirmationResult) {
      return { success: false, error: 'No active OTP request found.' };
    }

    const result = await confirmationResult.confirm(otpCode);
    return { success: !!result.user };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid Firebase OTP code' };
  }
}
