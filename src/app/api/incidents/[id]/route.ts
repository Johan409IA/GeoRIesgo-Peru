// src/app/api/incidents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { replicationService, IncidentData } from "@/lib/replication/services";
import { PostgreSQLConnector } from "@/lib/replication/connectors";
import { mapStatusToSpanish } from "@/lib/utils/status-mapper";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const {
      title,
      reportedBy,
      description,
      status,
      descriptiveLocation,
      latitud,
      longitud,
    } = await request.json();

    // Validar que el incidente existe
    const client = await PostgreSQLConnector.connect();
    const existing = await client.query(
      "SELECT * FROM incidents WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { error: "Incidente no encontrado" },
        { status: 404 }
      );
    }

    const existingData = existing.rows[0];

    // Determinar el status final (el recibido o el existente)
    const finalStatus = status || existingData.status;

    // Convertir status de inglés a español para el servicio de replicación
    const statusInSpanish = mapStatusToSpanish(finalStatus);

    // Actualizar en PostgreSQL - usar status en inglés
    await client.query(
      "UPDATE incidents SET title = $1, reported_by = $2, description = $3, status = $4, descriptive_location = $5, latitud = $6, longitud = $7, updated_at = $8 WHERE id = $9",
      [
        title || existingData.title,
        reportedBy || existingData.reported_by,
        description || existingData.description,
        finalStatus, // ✅ Mantener en inglés para PostgreSQL
        descriptiveLocation || existingData.descriptive_location,
        latitud !== undefined ? latitud : existingData.latitud,
        longitud !== undefined ? longitud : existingData.longitud,
        new Date(),
        id,
      ]
    );
    await client.end();

    const updatedData: IncidentData = {
      id,
      title: title || existingData.title,
      reportedBy: reportedBy || existingData.reported_by || "",
      description: description || existingData.description,
      status: statusInSpanish, // ✅ Convertido a español
      descriptiveLocation:
        descriptiveLocation || existingData.descriptive_location || "",
      latitud: latitud !== undefined ? latitud : existingData.latitud,
      longitud: longitud !== undefined ? longitud : existingData.longitud,
      updatedAt: new Date(),
    };

    // Replicar la actualización
    await replicationService.recordChange(
      "postgresql",
      "UPDATE",
      updatedData,
      "incidents"
    );

    return NextResponse.json({
      success: true,
      message: "Incidente actualizado y replicación iniciada",
      data: updatedData,
    });
  } catch (error: any) {
    console.error("Error updating incident:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validar que el incidente existe y obtener datos para replicación
    const client = await PostgreSQLConnector.connect();
    const existing = await client.query(
      "SELECT * FROM incidents WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { error: "Incidente no encontrado" },
        { status: 404 }
      );
    }

    const existingData = existing.rows[0];

    // Convertir status de inglés a español para el servicio de replicación
    const statusInSpanish = mapStatusToSpanish(existingData.status);

    // Eliminar de PostgreSQL
    await client.query("DELETE FROM incidents WHERE id = $1", [id]);
    await client.end();

    // Preparar datos para replicación (necesitamos todos los campos para DELETE)
    const deletedData: IncidentData = {
      id,
      title: existingData.title,
      reportedBy: existingData.reported_by || "",
      description: existingData.description,
      status: statusInSpanish, // ✅ Convertido a español
      descriptiveLocation: existingData.descriptive_location || "",
      latitud: existingData.latitud || 0,
      longitud: existingData.longitud || 0,
    };

    // Replicar la eliminación
    await replicationService.recordChange(
      "postgresql",
      "DELETE",
      deletedData,
      "incidents"
    );

    return NextResponse.json({
      success: true,
      message: "Incidente eliminado y replicación iniciada",
    });
  } catch (error: any) {
    console.error("Error deleting incident:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
