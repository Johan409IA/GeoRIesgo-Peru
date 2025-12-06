// src/app/api/resources/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  replicationService,
  resourceData,
} from "@/lib/replication/services";
import { generateResourceId } from "@/lib/utils/id-generator";
import { PostgreSQLConnector } from "@/lib/replication/connectors";

export async function POST(request: NextRequest) {
  try {
    const { name, type, status = "Disponible" } = await request.json();

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    const resourceId = generateResourceId();
    const resourceDataObj: resourceData = {
      id: resourceId,
      name,
      type,
      status,
      createdAt: new Date(),
    };

    // Insertar en PostgreSQL
    const client = await PostgreSQLConnector.connect();
    await client.query(
      "INSERT INTO resources (id, name, type, status, created_at) VALUES ($1, $2, $3, $4, $5)",
      [resourceId, name, type, status, new Date()]
    );
    await client.end();

    // Replicar
    await replicationService.recordChange(
      "postgresql",
      "INSERT",
      resourceDataObj,
      "resources"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Recurso creado y replicación iniciada",
        id: resourceId,
        data: resourceDataObj,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating resource:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Leer recursos desde PostgreSQL
    const client = await PostgreSQLConnector.connect();
    const result = await client.query(
      "SELECT id, name, type, status, created_at FROM resources ORDER BY created_at DESC"
    );
    await client.end();

    return NextResponse.json({
      success: true,
      resources: result.rows,
    });
  } catch (error: any) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
