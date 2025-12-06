// Función para convertir status de inglés (BD) a español (aplicación)
export function mapStatusToSpanish(
  dbStatus: string
): "Activo" | "En Proceso" | "Cerrado" {
  const statusMap: Record<string, "Activo" | "En Proceso" | "Cerrado"> = {
    open: "Activo",
    in_progress: "En Proceso",
    closed: "Cerrado",
  };
  return statusMap[dbStatus] || "Activo";
}

// Función para convertir status de español (aplicación) a inglés (BD)
export function mapStatusToEnglish(
  appStatus: "Activo" | "En Proceso" | "Cerrado"
): string {
  const statusMap: Record<string, string> = {
    Activo: "open",
    "En Proceso": "in_progress",
    Cerrado: "closed",
  };
  return statusMap[appStatus] || "open";
}
