import { StatsCards } from "./components/stats-cards";
import { IncidentTable } from "./components/incident-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import type { Incident } from "@/lib/data";

// Mapear status de la API al formato del frontend
function mapStatusFromAPI(status: string): "Activo" | "En Proceso" | "Cerrado" {
  const statusMap: Record<string, "Activo" | "En Proceso" | "Cerrado"> = {
    open: "Activo",
    in_progress: "En Proceso",
    closed: "Cerrado",
  };
  return statusMap[status] || "Activo";
}

async function getIncidents(): Promise<Incident[]> {
  try {
    const { PostgreSQLConnector } = await import(
      "@/lib/replication/connectors"
    );
    const client = await PostgreSQLConnector.connect();
    const result = await client.query(
      "SELECT id, title, reported_by, description, status, descriptive_location, latitud, longitud, created_at, updated_at FROM incidents ORDER BY created_at DESC"
    );
    await client.end();

    return result.rows.map((inc: any) => ({
      id: inc.id,
      title: inc.title,
      description: inc.description,
      status: mapStatusFromAPI(inc.status),
      descriptiveLocation: inc.descriptive_location || "",
      latitude: inc.latitud || 0,
      longitude: inc.longitud || 0,
      createdAt: inc.created_at || new Date().toISOString(),
      reportedBy: inc.reported_by || "",
      operatorNotes: [],
      assignedResource: undefined,
    }));
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return [];
  }
}

export default async function DashboardPage() {
  const incidents = await getIncidents();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary to-primary/80 border-b border-border shadow-lg">
        <div className="px-8 py-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-primary-foreground">
                Dashboard de Incidentes
              </h1>
              <p className="text-primary-foreground/90">
                Una vista general de todos los incidentes reportados
              </p>
            </div>

            <Button
              asChild
              className="bg-background hover:bg-background/90 text-foreground font-semibold py-3 px-6 h-auto w-fit shadow-lg hover:shadow-xl transition-all"
            >
              <Link href="/incidents/new" className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Nuevo Incidente
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 space-y-8 max-w-7xl mx-auto">
        <div className="w-full">
          <StatsCards incidents={incidents} />
        </div>

        <div className="w-full">
          <IncidentTable incidents={incidents} />
        </div>
      </div>
    </div>
  );
}
