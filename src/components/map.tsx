"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import { useState, useEffect, useRef } from "react";

// Soluciona problema con los íconos de Leaflet en Next.js
if (typeof window !== "undefined") {
  delete (Icon.Default.prototype as any)._getIconUrl;
  Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

type MapProps = {
  latitude: number;
  longitude: number;
};

export function MapComponent({ latitude, longitude }: MapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [mapKey, setMapKey] = useState<string>("");
  const instanceIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const position: [number, number] = [latitude, longitude];

  // Asegura que el componente solo se monte en el cliente y genera IDs únicos
  useEffect(() => {
    setIsMounted(true);
    // Genera un ID único que persiste durante la vida del componente
    if (!instanceIdRef.current) {
      instanceIdRef.current = `map-instance-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`;
    }
  }, []);

  // Genera una clave única cuando cambian las coordenadas para forzar remount
  useEffect(() => {
    if (instanceIdRef.current) {
      setMapKey(`${latitude}-${longitude}-${instanceIdRef.current}`);
    }
  }, [latitude, longitude]);

  // Limpia el contenedor antes de desmontar o cuando cambia la clave
  useEffect(() => {
    return () => {
      if (containerRef.current && typeof window !== "undefined") {
        // Limpia cualquier instancia de Leaflet en el contenedor
        const container = containerRef.current;
        if ((container as any)._leaflet_id) {
          delete (container as any)._leaflet_id;
        }
        // También limpia cualquier hijo que pueda tener un _leaflet_id
        const leafletElements =
          container.querySelectorAll("[class*='leaflet']");
        leafletElements.forEach((el) => {
          if ((el as any)._leaflet_id) {
            delete (el as any)._leaflet_id;
          }
        });
      }
    };
  }, [mapKey]);

  // Valida que las coordenadas sean válidas
  const isValidPosition =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!isMounted || !isValidPosition || !mapKey) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Cargando mapa...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      key={mapKey}
      style={{ height: "100%", width: "100%" }}
    >
      <MapContainer
        key={mapKey}
        center={position}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}></Marker>
      </MapContainer>
    </div>
  );
}
