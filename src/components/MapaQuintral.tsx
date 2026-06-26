"use client";
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { colorHospedero, etiquetaHospedero } from "@/lib/hosts";
import { isSafePhotoUrl } from "@/lib/photoUrl";
import type { Observation } from "@/lib/types";

const CENTRO_DEFAULT: [number, number] = [-33.2123, -70.342];

export default function MapaQuintral({ observations }: { observations: Observation[] }) {
  return (
    <MapContainer center={CENTRO_DEFAULT} zoom={14} style={{ height: 480, width: "100%" }}>
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
            }}
          >
            <Popup>
              <strong>{etiquetaHospedero(observation.hospedero)}</strong>
              <br />
              {observation.fenologia || "sin fenologia"}
              <br />
              {observation.cerro ?? "sin cerro"} · {observation.nombreObservador}
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
