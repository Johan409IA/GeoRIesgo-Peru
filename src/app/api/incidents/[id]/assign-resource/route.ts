// src/app/api/incidents/[id]/assign-resource/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PostgreSQLConnector } from "@/lib/replication/connectors";
import {
  replicationService,
  type resourceData,
} from "@/lib/replication/services";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { resourceId } = await request.json();

    if (!resourceId) {
      return NextResponse.json(
        { error: "resourceId es requerido" },
        { status: 400 }
      );
    }

    const client = await PostgreSQLConnector.connect();

    try {
      await client.query("BEGIN");

      // Verificar que el incidente exista
      const incidentResult = await client.query(
        "SELECT id FROM incidents WHERE id = $1",
        [id]
      );
      if (incidentResult.rows.length === 0) {
        await client.query("ROLLBACK");
        await client.end();
        return NextResponse.json(
          { error: "Incidente no encontrado" },
          { status: 404 }
        );
      }

      // Verificar que el recurso exista
      const resourceResult = await client.query(
        "SELECT id, name, type, status, created_at FROM resources WHERE id = $1",
        [resourceId]
      );
      if (resourceResult.rows.length === 0) {
        await client.query("ROLLBACK");
        await client.end();
        return NextResponse.json(
          { error: "Recurso no encontrado" },
          { status: 404 }
        );
      }

      const resourceRow = resourceResult.rows[0];

      // Actualizar el estado del recurso a "Asignado"
      await client.query("UPDATE resources SET status = $1 WHERE id = $2", [
        "Asignado",
        resourceId,
      ]);

      // Si en el futuro se agrega una columna assigned_resource en incidents,
      // aquí podríamos actualizarla también.
      // await client.query("UPDATE incidents SET assigned_resource = $1 WHERE id = $2", [resourceId, id]);

      await client.query("COMMIT");
      await client.end();

      const replicatedResource: resourceData = {
        id: resourceRow.id,
        name: resourceRow.name,
        type: resourceRow.type,
        status: "Asignado",
        createdAt: resourceRow.created_at
          ? new Date(resourceRow.created_at)
          : new Date(),
      };

      // Replicar el cambio de estado del recurso a las demás bases de datos
      await replicationService.recordChange(
        "postgresql",
        "UPDATE",
        replicatedResource,
        "resources"
      );

      return NextResponse.json({
        success: true,
        message:
          "Recurso asignado al incidente y estado replicado en las bases de datos",
        incidentId: id,
        resourceId,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      await client.end();
      throw error;
    }
  } catch (error: any) {
    console.error("Error asignando recurso al incidente:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}


