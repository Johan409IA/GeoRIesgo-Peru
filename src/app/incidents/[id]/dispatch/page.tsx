import { notFound } from "next/navigation";
import { ResourceDispatchForm } from "../../components/resource-dispatch-form";
import type { Incident } from "@/lib/data";
import { Client as PGClient } from "pg";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

// Reutilizamos el mismo mapeo de estados que en otras páginas
function mapStatus(dbStatus: string): Incident["status"] {
  const statusMap: { [key: string]: Incident["status"] } = {
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

async function getIncidentFromDB(id: string): Promise<Incident | null> {
  const client = new PGClient({ connectionString: process.env.PG_URI });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, title, reported_by, description, status, descriptive_location, latitud, longitud, created_at
       FROM incidents
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: mapStatus(row.status),
      descriptiveLocation: row.descriptive_location,
      latitude: parseFloat(row.latitud),
      longitude: parseFloat(row.longitud),
      createdAt: new Date(row.created_at).toISOString(),
      reportedBy: row.reported_by || "",
      operatorNotes: [],
      // assignedResource aún no se almacena en BD
    };
  } finally {
    await client.end();
  }
}

export default async function DispatchResourcePage({
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
            Despachar Ayuda para: {incident.title}
          </h1>
          <p className="text-muted-foreground">
            Asigna recursos para atender el incidente seleccionado.
          </p>
        </div>
      </div>
      <ResourceDispatchForm incident={incident} />
    </div>
  );
}
