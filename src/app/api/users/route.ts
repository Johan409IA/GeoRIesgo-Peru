// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { replicationService } from "@/lib/replication/services";
import { PostgreSQLConnector } from "@/lib/replication/connectors";
import { generateUserId } from "@/lib/utils/id-generator";

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password } = await request.json();

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const client = await PostgreSQLConnector.connect();
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.end();
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 }
      );
    }

    const userId = generateUserId();
    const userData = {
      id: userId,
      fullName,
      email,
      password, // Deberías hashearlo antes
      createdAt: new Date(),
    };

    // Insertar en PostgreSQL
    await client.query(
      "INSERT INTO users (id, full_name, email, password, created_at) VALUES ($1, $2, $3, $4, $5)",
      [userId, fullName, email, password, new Date()]
    );
    await client.end();

    // Replicar
    await replicationService.recordChange(
      "postgresql",
      "INSERT",
      userData,
      "users"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Usuario creado y replicación iniciada",
        id: userId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Leer usuarios desde PostgreSQL
    const client = await PostgreSQLConnector.connect();
    const result = await client.query(
      "SELECT id, full_name, email, created_at FROM users ORDER BY created_at DESC"
    );
    await client.end();

    return NextResponse.json({
      success: true,
      users: result.rows,
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
