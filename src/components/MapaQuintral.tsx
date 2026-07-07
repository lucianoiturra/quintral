"use client";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { colorHospedero, etiquetaHospedero } from "@/lib/hosts";
import { isSafePhotoUrl } from "@/lib/photoUrl";
import type { Observation } from "@/lib/types";

const CENTRO_DEFAULT: [number, number] = [-33.3560, -70.5720];

export default function MapaQuintral({ observations }: { observations: Observation[] }) {
  const centro: [number, number] = observations.length
    ? [
        observations.reduce((s, o) => s + o.lat, 0) / observations.length,
        observations.reduce((s, o) => s + o.lng, 0) / observations.length,
      ]
    : CENTRO_DEFAULT;

  return (
    <MapContainer center={centro} zoom={14} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap"
      />
      {observations.map((observation) => {
        const fotoSegura = isSafePhotoUrl(observation.fotoUrl) ? observation.fotoUrl : null;

        return (
          <CircleMarker
            key={observation.id}
            center={[observation.lat, observation.lng]}
            radius={8}
            pathOptions={{
              color: colorHospedero(observation.hospedero),
              fillOpacity: 0.8,
              weight: observation.verificada ? 3 : 1,
            }}
          >
            <Popup>
              <strong>{etiquetaHospedero(observation.hospedero)}</strong>
              <br />
              {observation.fenologia || "sin fenologia"}
              <br />
              {observation.cerro ?? "sin cerro"} · {observation.nombreObservador}
              {observation.verificada ? (
                <>
                  <br />
                  <span style={{ color: "#1d7c45", fontWeight: 700 }}>Verificado</span>
                </>
              ) : null}
              {fotoSegura ? (
                <>
                  <br />
                  <img src={fotoSegura} alt="ejemplar" style={{ width: 160, marginTop: 4 }} />
                </>
              ) : null}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
