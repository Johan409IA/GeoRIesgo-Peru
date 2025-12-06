import { IncidentForm } from "../components/incident-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NewIncidentPage() {
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
            Crear Nuevo Incidente
          </h1>
          <p className="text-muted-foreground">
            Complete el formulario para reportar un nuevo incidente.
          </p>
        </div>
      </div>
      <IncidentForm />
    </div>
  );
}
