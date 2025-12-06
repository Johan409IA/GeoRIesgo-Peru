import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Edit, Truck, FileText, User, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IncidentMap } from "./components/incident-map";
import { ClientDateTime } from "@/app/dashboard/components/client-date-time";
import { Client as PGClient } from "pg";

// Función para mapear el status de la base de datos al formato de la aplicación
function mapStatus(dbStatus: string): string {
  const statusMap: { [key: string]: string } = {
    open: "Activo",
    in_progress: "En Proceso",
    closed: "Cerrado",
  };
  return statusMap[dbStatus] || dbStatus;
}

// Función para obtener el incidente desde PostgreSQL
async function getIncidentFromDB(id: string) {
  const client = new PGClient({ connectionString: process.env.PG_URI });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, title, reported_by, description, status, descriptive_location, latitud, longitud, created_at, updated_at
       FROM incidents
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Mapear los datos de la base de datos al formato de la aplicación
    return {
      id: row.id,
      title: row.title,
      reportedBy: row.reported_by,
      description: row.description,
      status: mapStatus(row.status),
      descriptiveLocation: row.descriptive_location,
      latitude: parseFloat(row.latitud),
      longitude: parseFloat(row.longitud),
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at
        ? new Date(row.updated_at)
        : new Date(row.created_at),
      operatorNotes: [], // Las notas del operador se manejan como array vacío si no existen
      assignedResource: null, // Por ahora null, se puede extender para obtener recursos asignados
    };
  } catch (error) {
    console.error("Error al obtener incidente de PostgreSQL:", error);
    throw error;
  } finally {
    await client.end();
  }
}

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await getIncidentFromDB(id);

  if (!incident) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              <span className="sr-only">Volver al Dashboard</span>
            </Link>
          </Button>
          <div>
            <Badge
              variant={
                incident.status === "Activo"
                  ? "destructive"
                  : incident.status === "Cerrado"
                  ? "outline"
                  : "secondary"
              }
            >
              {incident.status}
            </Badge>
            <h1 className="text-3xl font-bold mt-2 text-foreground">
              {incident.title}
            </h1>
            <p className="text-muted-foreground">
              {incident.descriptiveLocation}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-2">
          <Button
            asChild
            variant="outline"
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            <Link href={`/incidents/${incident.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Link>
          </Button>
          <Button
            asChild
            className="shadow-md hover:shadow-lg transition-shadow"
          >
            <Link href={`/incidents/${incident.id}/dispatch`}>
              <Truck className="mr-2 h-4 w-4" /> Despachar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Mapa de Ubicación</CardTitle>
            </CardHeader>
            <CardContent>
              <IncidentMap
                latitude={incident.latitude}
                longitude={incident.longitude}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Detalles del Incidente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-1">Descripción</h3>
                <p className="text-muted-foreground">{incident.description}</p>
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Reportado por: {incident.reportedBy}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Reportado:{" "}
                  <ClientDateTime
                    date={incident.createdAt}
                    formatString="dd/MM/yyyy 'a las' HH:mm"
                  />
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Recurso Asignado</CardTitle>
            </CardHeader>
            <CardContent>
              {incident.assignedResource ? (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-md">
                    <Truck className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{incident.assignedResource}</p>
                    <p className="text-sm text-muted-foreground">
                      Recurso asignado
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay recursos asignados todavía.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notas del Operador
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incident.operatorNotes && incident.operatorNotes.length > 0 ? (
            <ul className="space-y-4">
              {incident.operatorNotes.map((note, index) => (
                <li key={index} className="text-sm flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0"></div>
                  <span className="text-muted-foreground">{note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay notas del operador todavía.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
