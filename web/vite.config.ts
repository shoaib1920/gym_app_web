import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // The Electron build loads index.html from the filesystem (file://), so
  // its asset URLs must be relative ("./assets/..."), not absolute
  // ("/assets/..."). The Vercel-hosted web build serves from a real domain
  // root, where absolute paths are correct — `--mode electron` (see
  // package.json's build:electron script) is the only thing that flips
  // this, so the live site's build is untouched.
  base: mode === "electron" ? "./" : "/",
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
}))
