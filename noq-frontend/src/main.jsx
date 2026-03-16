import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/FirebaseAuthContext.jsx'

// Firebase-only app: no localStorage shim, pure Firestore + sessionStorage

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
