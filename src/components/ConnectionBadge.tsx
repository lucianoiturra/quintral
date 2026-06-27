"use client";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

export default function ConnectionBadge() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <span className="conn-badge" role="status" aria-live="polite">
      <span className="conn-dot" aria-hidden="true" /> Sin conexión
    </span>
  );
}
