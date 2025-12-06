import { notFound } from "next/navigation";
import { IncidentForm } from "../../components/incident-form";
import { Client as PGClient } from "pg";
import type { IncidentStatus } from "@/lib/data";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

// Usar el tipo compartido en lugar de definir uno nuevo
function mapStatus(dbStatus: string): IncidentStatus {
  const statusMap: { [key: string]: IncidentStatus } = {
    open: "Activo",
    in_progress: "En Proceso",
    closed: "Cerrado",
  };
  if (statusMap[dbStatus]) {
    return statusMap[dbStatus];
  }
  throw new Error(
    `Estado de incidente no válido en la base de datos: ${dbStatus}`
  );
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
      createdAt: new Date(row.created_at).toISOString(), // ✅ Convertir Date a string ISO
      operatorNotes: [],
      // ✅ Omitir assignedResource si es null, o usar undefined
    };
  } catch (error) {
    console.error("Error al obtener incidente de PostgreSQL:", error);
    throw error;
  } finally {
    await client.end();
  }
}

export default async function EditIncidentPage({
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
    <div className="space-y-6 max-w-4xl mx-auto">
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
          <h1 className="text-3xl font-bold text-foreground">
            Editar Incidente: {incident.id}
          </h1>
          <p className="text-muted-foreground">
            Actualice la información del incidente.
          </p>
        </div>
      </div>
      {/* Esta línea ahora funcionará porque el objeto 'incident' es compatible */}
      <IncidentForm incident={incident} />
    </div>
  );
}
