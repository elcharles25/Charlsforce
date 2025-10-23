import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Leer de variables de entorno
const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY as string;
(window as any).__GEMINI_API_KEY__ = apiKey;

createRoot(document.getElementById("root")!).render(<App />);
