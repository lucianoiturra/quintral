"use client";
import { useEffect, useState } from "react";

interface PromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function PrepOffline() {
  const [instalable, setInstalable] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstalable(e as PromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <div className="prep-offline card card-pad">
      <strong>¿Vas a un cerro sin señal?</strong>
      <ol className="prep-list">
        <li>Instala la app en tu teléfono.</li>
        <li>Ábrela una vez <em>con señal</em> para que quede lista.</li>
        <li>Activa el permiso de ubicación (el GPS funciona sin datos).</li>
      </ol>
      {instalable && (
        <button
          type="button"
          className="btn btn--primary"
          onClick={async () => {
            await instalable.prompt();
            setInstalable(null);
          }}
        >
          Instalar app
        </button>
      )}
    </div>
  );
}
