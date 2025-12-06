"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const MapComponent = dynamic(
  () => import("@/components/map").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  }
);

type IncidentMapProps = {
  latitude: number;
  longitude: number;
};

export function IncidentMap({ latitude, longitude }: IncidentMapProps) {
  // Genera una clave única basada en las coordenadas para forzar remount cuando cambian
  const mapInstanceKey = useMemo(
    () => `incident-map-${latitude}-${longitude}`,
    [latitude, longitude]
  );

  return (
    <div
      key={mapInstanceKey}
      className="aspect-video rounded-md overflow-hidden border"
    >
      <MapComponent latitude={latitude} longitude={longitude} />
    </div>
  );
}
