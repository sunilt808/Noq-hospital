import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDs5oA29fYqyefrP8mpXgWheCSWRlH35Js',
  authDomain: 'no-q-cb4ca.firebaseapp.com',
  projectId: 'no-q-cb4ca',
  storageBucket: 'no-q-cb4ca.firebasestorage.app',
  messagingSenderId: '562907456952',
  appId: '1:562907456952:web:8046d938eb8036b3245b4d',
};

const app = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);
const firebaseDb = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

const ensureFirebaseAuthSession = async () => {
  return firebaseAuth.currentUser || null;
};

export { app, firebaseAuth, firebaseDb, ensureFirebaseAuthSession };