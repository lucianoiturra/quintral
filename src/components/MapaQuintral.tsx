"use client";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Observation } from "@/lib/types";
import { colorHospedero, etiquetaHospedero } from "@/lib/hosts";

export default function MapaQuintral({ observations }: { observations: Observation[] }) {
  const centro: [number, number] = observations.length
    ? [observations[0].lat, observations[0].lng]
    : [-33.2123, -70.342];

  return (
    <MapContainer center={centro} zoom={14} style={{ height: 480, width: "100%" }}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {observations.map((o) => (
        <CircleMarker
          key={o.id}
          center={[o.lat, o.lng]}
          radius={8}
          pathOptions={{ color: colorHospedero(o.hospedero), fillOpacity: 0.8 }}
        >
          <Popup>
            <strong>{etiquetaHospedero(o.hospedero)}</strong>
            <br />
            {o.fenologia || "sin fenología"}
            <br />
            {o.cerro ?? ""} · {o.nombreObservador}
            {o.fotoUrl ? (
              <>
                <br />
                <img src={o.fotoUrl} alt="ejemplar" style={{ width: 160, marginTop: 4 }} />
              </>
            ) : null}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
