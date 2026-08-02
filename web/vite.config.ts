import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Without this, Vite's dependency pre-bundler can discover firebase/app
  // and firebase/auth in separate esbuild passes (auth gets pulled in a
  // moment later than app, as AuthContext imports resolve), producing two
  // copies of Firebase's internal component registry — which is exactly
  // what "Component auth has not been registered yet" means here even
  // though firebaseConfig.ts calls initializeAuth correctly. Forcing all
  // Firebase entry points into one optimizeDeps pass keeps them sharing a
  // single registry.
  optimizeDeps: {
    include: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
  },
})
