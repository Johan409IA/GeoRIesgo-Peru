"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Truck, Pencil, Trash2, Home } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

type ResourceRow = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function ResourcesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch("/api/resources", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("No se pudieron obtener los recursos");
      }

      const data = await res.json();
      const resourcesFromAPI: ResourceRow[] = data.resources || data.data || [];
      setResources(resourcesFromAPI);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los recursos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  async function handleDelete(id: string, name: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "No se pudo eliminar el recurso",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Recurso Eliminado",
        description: `El recurso "${name}" ha sido eliminado correctamente.`,
      });

      // Actualizar la lista de recursos
      await fetchResources();
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar el recurso",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Gestión de Recursos
            </h1>
            <p className="text-muted-foreground">
              Administra los recursos disponibles para la atención de
              incidentes.
            </p>
          </div>
        </div>
        <Button asChild className="shadow-md hover:shadow-lg transition-shadow">
          <Link href="/resources/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Recurso
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Listado de Recursos</CardTitle>
          <CardDescription>
            Recursos actualmente registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre / Identificador</TableHead>
                  <TableHead>Tipo de Recurso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Cargando recursos...
                    </TableCell>
                  </TableRow>
                ) : resources.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No hay recursos registrados. Crea uno nuevo para comenzar.
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-secondary rounded-md">
                            <Truck className="h-5 w-5 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">{resource.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {resource.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{resource.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            resource.status === "Disponible"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {resource.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            asChild
                            className="shadow-sm hover:shadow-md transition-shadow"
                          >
                            <Link href={`/resources/${resource.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={deletingId === resource.id}
                                className="shadow-sm hover:shadow-md transition-shadow"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Estás seguro?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará
                                  permanentemente el recurso
                                  <span className="font-semibold">
                                    {" "}
                                    &quot;{resource.name}&quot;{" "}
                                  </span>
                                  de todas las bases de datos conectadas
                                  (PostgreSQL, MongoDB, Oracle y Cassandra).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDelete(resource.id, resource.name)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingId === resource.id
                                    ? "Eliminando..."
                                    : "Eliminar"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
