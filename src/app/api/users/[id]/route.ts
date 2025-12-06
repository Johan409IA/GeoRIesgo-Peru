// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { replicationService, userData } from "@/lib/replication/services";
import { PostgreSQLConnector } from "@/lib/replication/connectors";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { fullName, email, password } = await request.json();

    // Validar que el usuario existe
    const client = await PostgreSQLConnector.connect();
    const existing = await client.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);

    if (existing.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const existingData = existing.rows[0];

    // Actualizar en PostgreSQL
    await client.query(
      "UPDATE users SET full_name = $1, email = $2, password = $3 WHERE id = $4",
      [
        fullName || existingData.full_name,
        email || existingData.email,
        password || existingData.password,
        id,
      ]
    );
    await client.end();

    const updatedData: userData = {
      id,
      fullName: fullName || existingData.full_name,
      email: email || existingData.email,
      password: password || existingData.password,
      createdAt: existingData.created_at,
    };

    // Replicar la actualización
    await replicationService.recordChange(
      "postgresql",
      "UPDATE",
      updatedData,
      "users"
    );

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado y replicación iniciada",
      data: updatedData,
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
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

    // Validar que el usuario existe y obtener datos para replicación
    const client = await PostgreSQLConnector.connect();
    const existing = await client.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);

    if (existing.rows.length === 0) {
      await client.end();
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const existingData = existing.rows[0];

    // Eliminar de PostgreSQL
    await client.query("DELETE FROM users WHERE id = $1", [id]);
    await client.end();

    // Preparar datos para replicación
    const deletedData: userData = {
      id,
      fullName: existingData.full_name,
      email: existingData.email,
      password: existingData.password,
      createdAt: existingData.created_at,
    };

    // Replicar la eliminación
    await replicationService.recordChange(
      "postgresql",
      "DELETE",
      deletedData,
      "users"
    );

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado y replicación iniciada",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
