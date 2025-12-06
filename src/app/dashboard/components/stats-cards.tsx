import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resources } from "@/lib/data";
import type { Incident } from "@/lib/data";
import { AlertTriangle, CheckCircle, Truck } from "lucide-react";

type StatsCardsProps = {
  incidents: Incident[];
};

export function StatsCards({ incidents }: StatsCardsProps) {
  const activeIncidents = incidents.filter((i) => i.status === "Activo").length;
  const closedIncidents = incidents.filter(
    (i) => i.status === "Cerrado"
  ).length;
  const resourcesAvailable = resources.filter(
    (r) => r.status === "Disponible"
  ).length;

  return (
    // Grid responsivo: 1 columna en mobile, 2 en tablet, 3 en desktop
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Tarjeta 1: Incidentes Activos */}
      <Card className="bg-white border border-blue-600 shadow-lg hover:shadow-xl transition-shadow">
        {/* Encabezado con título y icono */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          {/* Título en Gris Oscuro (text-slate-700) */}
          <CardTitle className="text-sm font-semibold text-slate-700">
            Incidentes Activos
          </CardTitle>
          {/* Icono de alerta en Signal Red (text-red-600) */}
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        {/* Contenido con número y descripción */}
        <CardContent>
          {/* Número en Deep Navy (text-slate-900) y bold */}
          <div className="text-2xl font-bold text-slate-900">
            {activeIncidents}
          </div>
          {/* Descripción en Slate Grey (text-slate-600) */}
          <p className="text-xs text-slate-600 mt-1">
            Requieren atención inmediata
          </p>
        </CardContent>
      </Card>

      {/* Tarjeta 2: Incidentes Cerrados */}
      <Card className="bg-white border border-blue-600 shadow-lg hover:shadow-xl transition-shadow">
        {/* Encabezado con título y icono */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          {/* Título en Gris Oscuro (text-slate-700) */}
          <CardTitle className="text-sm font-semibold text-slate-700">
            Incidentes Cerrados
          </CardTitle>
          {/* Icono de éxito en Emerald Safe (text-emerald-600) */}
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        {/* Contenido con número y descripción */}
        <CardContent>
          {/* Número en Deep Navy (text-slate-900) y bold */}
          <div className="text-2xl font-bold text-slate-900">
            {closedIncidents}
          </div>
          {/* Descripción en Slate Grey (text-slate-600) */}
          <p className="text-xs text-slate-600 mt-1">
            Resueltos satisfactoriamente
          </p>
        </CardContent>
      </Card>

      {/* Tarjeta 3: Recursos Disponibles */}
      <Card className="bg-white border border-blue-600 shadow-lg hover:shadow-xl transition-shadow">
        {/* Encabezado con título y icono */}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          {/* Título en Gris Oscuro (text-slate-700) */}
          <CardTitle className="text-sm font-semibold text-slate-700">
            Recursos Disponibles
          </CardTitle>
          {/* Icono de recurso en Electric Blue (text-blue-600) */}
          <Truck className="h-4 w-4 text-blue-600" />
        </CardHeader>
        {/* Contenido con número y descripción */}
        <CardContent>
          {/* Número en Deep Navy (text-slate-900) y bold */}
          <div className="text-2xl font-bold text-slate-900">
            {resourcesAvailable}
          </div>
          {/* Descripción en Slate Grey (text-slate-600) */}
          <p className="text-xs text-slate-600 mt-1">
            Listos para ser despachados
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
