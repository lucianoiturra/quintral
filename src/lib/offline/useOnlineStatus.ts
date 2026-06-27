"use client";
import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const subir = () => setOnline(true);
    const bajar = () => setOnline(false);
    window.addEventListener("online", subir);
    window.addEventListener("offline", bajar);
    return () => {
      window.removeEventListener("online", subir);
      window.removeEventListener("offline", bajar);
    };
  }, []);

  return online;
}
