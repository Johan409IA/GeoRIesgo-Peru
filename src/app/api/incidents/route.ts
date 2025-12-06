// src/app/api/incidents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { replicationService, IncidentData } from "@/lib/replication/services";
import { generateIncidentId } from "@/lib/utils/id-generator";
import { PostgreSQLConnector } from "@/lib/replication/connectors";
import { mapStatusToSpanish } from "@/lib/utils/status-mapper";

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      reportedBy = "",
      description,
      status = "open",
      descriptiveLocation = "",
      latitud = 0,
      longitud = 0,
    } = await request.json();

    // Validar datos requeridos
    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const incidentId = generateIncidentId();

    // Convertir status de inglés a español para el servicio de replicación
    const statusInSpanish = mapStatusToSpanish(status);

    const incidentData: IncidentData = {
      id: incidentId,
      title,
      reportedBy,
      description,
      status: statusInSpanish, // ✅ Ahora está en español
      descriptiveLocation,
      latitud,
      longitud,
      updatedAt: new Date(),
    };

    // 1. Insertar en PostgreSQL (base de datos principal) - usar status en inglés
    const client = await PostgreSQLConnector.connect();
    await client.query(
      "INSERT INTO incidents (id, title, reported_by, description, status, descriptive_location, latitud, longitud, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        incidentId,
        title,
        reportedBy,
        description,
        status, // ✅ Mantener en inglés para PostgreSQL
        descriptiveLocation,
        latitud,
        longitud,
        new Date(),
        new Date(),
      ]
    );
    await client.end();

    // 2. Iniciar replicación a las demás bases de datos
    await replicationService.recordChange(
      "postgresql",
      "INSERT",
      incidentData, // ✅ Ahora tiene status en español
      "incidents"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Incidente creado y replicación iniciada",
        id: incidentId,
        data: incidentData,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating incident:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Leer incidentes desde PostgreSQL (podrías elegir cualquier BD)
    const client = await PostgreSQLConnector.connect();
    const result = await client.query(
      "SELECT id, title, reported_by, description, status, descriptive_location, latitud, longitud, created_at, updated_at FROM incidents ORDER BY created_at DESC"
    );
    await client.end();

    return NextResponse.json({
      success: true,
      incidents: result.rows,
    });
  } catch (error: any) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
