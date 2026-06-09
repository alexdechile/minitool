import { useState } from "react";
import "./App.css";
import HubView from "./views/HubView";
import ColorLens from "./views/ColorLens";
import DecibelMeter from "./views/DecibelMeter";
import Surveyor from "./views/Surveyor";
import Seismograph from "./views/Seismograph";
import LuxMeter from "./views/LuxMeter";
import PhotoAssistant from "./views/PhotoAssistant";

type View = "hub" | "colorlens" | "decibel-meter" | "surveyor" | "seismograph" | "lux-meter" | "photo-assistant";

function App() {
  const [view, setView] = useState<View>("hub");

  const navigateTo = (newView: View) => {
    setView(newView);
  };

  const handleBack = () => setView("hub");

  // Pre-solicitar permisos al inicio para mejorar la experiencia
  useState(() => {
    const requestInitialPermissions = async () => {
      try {
        // Esto disparará los diálogos del sistema en Android
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Si llegamos aquí, los permisos están dados o al menos el diálogo se mostró
      } catch (err) {
        console.warn("Permisos iniciales no otorgados:", err);
      }
    };
    requestInitialPermissions();
  });

  return (
    <div className="app-container">
      {view === "hub" ? (
        <HubView onNavigate={(v) => navigateTo(v as View)} />
      ) : (
        <>
          {view === "colorlens" && <ColorLens onBack={handleBack} />}
          {view === "decibel-meter" && <DecibelMeter onBack={handleBack} />}
          {view === "surveyor" && <Surveyor onBack={handleBack} />}
          {view === "seismograph" && <Seismograph onBack={handleBack} />}
          {view === "lux-meter" && <LuxMeter onBack={handleBack} />}
          {view === "photo-assistant" && <PhotoAssistant onBack={handleBack} />}
        </>
      )}
    </div>
  );
}

export default App;
