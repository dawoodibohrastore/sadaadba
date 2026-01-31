// Firebase Configuration for Sadaa Instrumentals
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA0hAFMJesswOJH4pDVlY6_7SC2Ut1xXGo",
  authDomain: "dawoodibohra-instrumental.firebaseapp.com",
  projectId: "dawoodibohra-instrumental",
  storageBucket: "dawoodibohra-instrumental.firebasestorage.app",
  messagingSenderId: "429560442123",
  appId: "1:429560442123:web:03a63630658ce6f202460e",
  measurementId: "G-74J591KC7Q"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const storage = getStorage(app);

export { app, storage, firebaseConfig };
