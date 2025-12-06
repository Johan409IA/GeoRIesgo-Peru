// src/app/api/resources/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  replicationService,
  resourceData,
} from "@/lib/replication/services";
import { PostgreSQLConnector } from "@/lib/replication/connectors";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, type, status } = await request.json();

    // Validar que el recurso existe
    const client = await PostgreSQLConnector.connect();
    const existing = await client.query(
      "SELECT * FROM resources WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { error: "Recurso no encontrado" },
        { status: 404 }
      );
    }

    const existingData = existing.rows[0];

    // Actualizar en PostgreSQL
    await client.query(
      "UPDATE resources SET name = $1, type = $2, status = $3 WHERE id = $4",
      [
        name || existingData.name,
        type || existingData.type,
        status || existingData.status,
        id,
      ]
    );
    await client.end();

    const updatedData: resourceData = {
      id,
      name: name || existingData.name,
      type: type || existingData.type,
      status: status || existingData.status,
      createdAt: existingData.created_at,
    };

    // Replicar la actualización
    await replicationService.recordChange(
      "postgresql",
      "UPDATE",
      updatedData,
      "resources"
    );

    return NextResponse.json({
      success: true,
      message: "Recurso actualizado y replicación iniciada",
      data: updatedData,
    });
  } catch (error: any) {
    console.error("Error updating resource:", error);
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

    // Validar que el recurso existe y obtener datos para replicación
    const client = await PostgreSQLConnector.connect();
    const existing = await client.query(
      "SELECT * FROM resources WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { error: "Recurso no encontrado" },
        { status: 404 }
      );
    }

    const existingData = existing.rows[0];

    // Eliminar de PostgreSQL
    await client.query("DELETE FROM resources WHERE id = $1", [id]);
    await client.end();

    // Preparar datos para replicación
    const deletedData: resourceData = {
      id,
      name: existingData.name,
      type: existingData.type,
      status: existingData.status,
      createdAt: existingData.created_at,
    };

    // Replicar la eliminación
    await replicationService.recordChange(
      "postgresql",
      "DELETE",
      deletedData,
      "resources"
    );

    return NextResponse.json({
      success: true,
      message: "Recurso eliminado y replicación iniciada",
    });
  } catch (error: any) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
