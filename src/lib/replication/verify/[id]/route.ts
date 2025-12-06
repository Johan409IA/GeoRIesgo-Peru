// src/app/api/replication/verify/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  PostgreSQLConnector,
  MongoDBConnector,
  OracleConnector,
  CassandraConnector,
} from "@/lib/replication/connectors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [postgresResult, mongoResult, oracleResult, cassandraResult] =
      await Promise.all([
        getFromPostgreSQL(id),
        getFromMongoDB(id),
        getFromOracle(id),
        getFromCassandra(id),
      ]);

    const allResults = {
      postgresql: postgresResult,
      mongodb: mongoResult,
      oracle: oracleResult,
      cassandra: cassandraResult,
    };

    // Verificar si todos los datos coinciden
    const allMatch = checkIfAllMatch(Object.values(allResults));

    return NextResponse.json({
      success: true,
      incidentId: id,
      databases: allResults,
      allMatch,
      message: allMatch
        ? "✅ Todos los datos coinciden en todas las bases de datos"
        : "⚠️ Hay diferencias entre las bases de datos",
    });
  } catch (error: any) {
    console.error("Error verifying replication:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

async function getFromPostgreSQL(id: string) {
  try {
    const client = await PostgreSQLConnector.connect();
    const result = await client.query(
      "SELECT id, title, description, status, created_at FROM incidents WHERE id = $1",
      [id]
    );
    await client.end();
    return result.rows[0] || null;
  } catch (error) {
    console.error("PostgreSQL fetch error:", error);
    return null;
  }
}

async function getFromMongoDB(id: string) {
  try {
    const client = await MongoDBConnector.connect();
    const collection = client.db().collection("incidents");
    const result = await collection.findOne({ _id: id as any });
    await client.close();
    return result;
  } catch (error) {
    console.error("MongoDB fetch error:", error);
    return null;
  }
}

async function getFromOracle(id: string) {
  try {
    const connection = await OracleConnector.connect();
    const result = await connection.execute(
      "SELECT id, title, description, status, created_at FROM incidents WHERE id = :id",
      [id]
    );
    await connection.close();

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as any[];
      return {
        id: row[0],
        title: row[1],
        description: row[2],
        status: row[3],
        created_at: row[4],
      };
    }
    return null;
  } catch (error) {
    console.error("Oracle fetch error:", error);
    return null;
  }
}

async function getFromCassandra(id: string) {
  try {
    const client = await CassandraConnector.connect();
    const result = await client.execute(
      "SELECT id, title, description, status, created_at FROM incidents WHERE id = ?",
      [id]
    );
    await client.shutdown();
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Cassandra fetch error:", error);
    return null;
  }
}

function checkIfAllMatch(results: any[]): boolean {
  const nonNullResults = results.filter((result) => result !== null);

  if (nonNullResults.length === 0) return false;

  const first = nonNullResults[0];

  return nonNullResults.every(
    (result) =>
      result.id === first.id &&
      result.title === first.title &&
      result.description === first.description &&
      result.status === first.status
  );
}
