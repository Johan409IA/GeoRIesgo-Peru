"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Incident } from "@/lib/data";
import { MoreHorizontal, Eye, Pencil, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { ClientDateTime } from "./client-date-time";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type IncidentTableProps = {
  incidents: Incident[];
};

export function IncidentTable({ incidents }: IncidentTableProps) {
  const [localIncidents, setLocalIncidents] = useState<Incident[]>(incidents);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este incidente?")) {
      return;
    }

    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo eliminar el incidente");
      }

      setLocalIncidents((prev) =>
        prev.filter((incident) => incident.id !== id)
      );

      toast({
        title: "Incidente eliminado",
        description: "El incidente se eliminó correctamente.",
      });

      router.refresh();
    } catch (error: any) {
      console.error("Error al eliminar incidente:", error);
      toast({
        title: "Error",
        description:
          error?.message ||
          "Ocurrió un error al intentar eliminar el incidente.",
        variant: "destructive",
      });
    }
  };

  return (
    // Contenedor principal con fondo blanco y sombra
    <div className="rounded-lg bg-white shadow-lg border border-slate-200 overflow-hidden">
      {/* Encabezado de la tabla */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 px-6 py-4">
        <h2 className="text-xl font-bold text-slate-900">
          Lista de Incidentes
        </h2>
      </div>

      {/* Contenido de la tabla */}
      <div className="overflow-x-auto">
        <Table>
          {/* Encabezado de columnas */}
          <TableHeader>
            <TableRow className="bg-slate-100 hover:bg-slate-100 border-b border-slate-300">
              <TableHead className="text-slate-900 font-bold">Título</TableHead>
              <TableHead className="text-slate-900 font-bold">Estado</TableHead>
              <TableHead className="hidden sm:table-cell text-slate-900 font-bold">
                Reportado Por
              </TableHead>
              <TableHead className="hidden md:table-cell text-slate-900 font-bold">
                Fecha
              </TableHead>
              <TableHead className="text-right text-slate-900 font-bold">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>

          {/* Filas de datos */}
          <TableBody>
            {localIncidents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-slate-500"
                >
                  No hay incidentes registrados
                </TableCell>
              </TableRow>
            ) : (
              localIncidents.map((incident) => (
                <TableRow
                  key={incident.id}
                  className="border-b border-slate-200 hover:bg-blue-50 transition-colors duration-150"
                >
                  {/* Título del incidente */}
                  <TableCell className="font-semibold text-slate-900 py-4">
                    {incident.title}
                  </TableCell>

                  {/* Estado con badge de color semántico */}
                  <TableCell className="py-4">
                    {incident.status === "Activo" && (
                      <Badge className="bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 font-semibold px-3 py-1">
                        ● {incident.status}
                      </Badge>
                    )}
                    {incident.status === "En Proceso" && (
                      <Badge className="bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 font-semibold px-3 py-1">
                        ● {incident.status}
                      </Badge>
                    )}
                    {incident.status === "Cerrado" && (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200 font-semibold px-3 py-1">
                        ● {incident.status}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Reportado por */}
                  <TableCell className="hidden sm:table-cell text-slate-600 py-4">
                    {incident.reportedBy}
                  </TableCell>

                  {/* Fecha */}
                  <TableCell className="hidden md:table-cell text-slate-600 py-4">
                    <ClientDateTime date={incident.createdAt} />
                  </TableCell>

                  {/* Menú de acciones */}
                  <TableCell className="text-right py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-9 w-9 p-0 hover:bg-blue-100 hover:text-blue-600 rounded-lg"
                        >
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-white border border-slate-200 rounded-lg shadow-xl"
                      >
                        <DropdownMenuLabel className="text-slate-900 font-semibold px-2 py-2">
                          Acciones
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-200" />

                        {/* Ver Detalles */}
                        <DropdownMenuItem
                          asChild
                          className="cursor-pointer text-slate-700 hover:bg-blue-50 focus:bg-blue-50"
                        >
                          <Link
                            href={`/incidents/${incident.id}`}
                            className="flex items-center gap-2 px-2 py-2"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                            <span>Ver Detalles</span>
                          </Link>
                        </DropdownMenuItem>

                        {/* Editar */}
                        <DropdownMenuItem
                          asChild
                          className="cursor-pointer text-slate-700 hover:bg-blue-50 focus:bg-blue-50"
                        >
                          <Link
                            href={`/incidents/${incident.id}/edit`}
                            className="flex items-center gap-2 px-2 py-2"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                            <span>Editar</span>
                          </Link>
                        </DropdownMenuItem>

                        {/* Despachar */}
                        <DropdownMenuItem
                          asChild
                          className="cursor-pointer text-slate-700 hover:bg-blue-50 focus:bg-blue-50"
                        >
                          <Link
                            href={`/incidents/${incident.id}/dispatch`}
                            className="flex items-center gap-2 px-2 py-2"
                          >
                            <Truck className="h-4 w-4 text-blue-600" />
                            <span>Despachar</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-slate-200" />

                        {/* Eliminar */}
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 px-2 py-2"
                          onClick={() => handleDelete(incident.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Eliminar</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
