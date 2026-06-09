import { useState, useEffect } from "react";

interface AppCard {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  gradient: string;
  disabled?: boolean;
  inDock?: boolean;
}

const apps: AppCard[] = [
  {
    id: "colorlens",
    name: "ColorLens",
    subtitle: "Captura colores de la naturaleza",
    icon: "🎨",
    gradient: "linear-gradient(135deg, #D4C5E2, #F5C6D0)",
    inDock: true,
  },
  {
    id: "decibel-meter",
    name: "Decibel Meter",
    subtitle: "Mide la intensidad del sonido",
    icon: "📊",
    gradient: "linear-gradient(135deg, #B8E6C8, #B8D4E3)",
  },
  {
    id: "surveyor",
    name: "Surveyor",
    subtitle: "GPS, Brújula y Pendiente",
    icon: "🧭",
    gradient: "linear-gradient(135deg, #1A1A1A, #333333)",
  },
  {
    id: "seismograph",
    name: "Sismógrafo",
    subtitle: "Detector de vibraciones",
    icon: "📈",
    gradient: "linear-gradient(135deg, #F5E6D3, #D5C6B3)",
  },
  {
    id: "lux-meter",
    name: "Luxómetro",
    subtitle: "Mide la intensidad de luz",
    icon: "💡",
    gradient: "linear-gradient(135deg, #FFF9C4, #FFF176)",
  },
  {
    id: "photo-assistant",
    name: "Asistente M50",
    subtitle: "Fotómetro para Canon EOS",
    icon: "📷",
    gradient: "linear-gradient(135deg, #1A1A1A, #F44336)",
  },
];

interface Props {
  onNavigate: (view: string) => void;
}

const StatusBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      width: "100%",
      padding: "8px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "14px",
      fontWeight: 600,
      color: "#3D3D3D",
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: 10,
    }}>
      <span>{formatTime(time)}</span>
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "12px" }}>📶</span>
        <span style={{ fontSize: "12px" }}>🔋</span>
      </div>
    </div>
  );
};

const AppIcon = ({ app, onClick }: { app: AppCard, onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={app.disabled}
    style={{
      background: "none",
      border: "none",
      padding: 0,
      margin: 0,
      cursor: app.disabled ? "not-allowed" : "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
      opacity: app.disabled ? 0.6 : 1,
      WebkitTapHighlightColor: "transparent",
      outline: "none",
      width: "100%",
    }}
    onPointerDown={(e) => {
      if (!app.disabled) {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)";
      }
    }}
    onPointerUp={(e) => {
      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
    }}
    onPointerLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
    }}
  >
    <div style={{
      width: "64px",
      height: "64px",
      background: app.gradient,
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "32px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      transition: "transform 0.1s",
    }}>
      {app.icon}
    </div>
    <span style={{
      fontSize: "11px",
      fontWeight: 500,
      color: "#3D3D3D",
      textAlign: "center",
      width: "70px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }}>
      {app.name}
    </span>
  </button>
);

export default function HubView({ onNavigate }: Props) {
  const gridApps = apps.filter(a => !a.inDock);
  const dockApps = apps.filter(a => a.inDock);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "linear-gradient(180deg, #FFF8F0 0%, #FFF0E6 100%)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      padding: "60px 24px 100px 24px",
      overflow: "hidden",
    }}>
      <StatusBar />

      {/* App Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "24px 12px",
        width: "100%",
        marginTop: "20px",
      }}>
        {gridApps.map((app) => (
          <AppIcon 
            key={app.id} 
            app={app} 
            onClick={() => !app.disabled && onNavigate(app.id)} 
          />
        ))}
      </div>

      {/* Dock */}
      <div style={{
        position: "absolute",
        bottom: "24px",
        left: "20px",
        right: "20px",
        height: "84px",
        background: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderRadius: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 16px",
        gap: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
      }}>
        {dockApps.map((app) => (
          <div key={app.id} style={{ width: "64px" }}>
            <AppIcon 
              app={app} 
              onClick={() => !app.disabled && onNavigate(app.id)} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}
