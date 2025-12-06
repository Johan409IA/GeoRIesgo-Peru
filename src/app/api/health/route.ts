// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import {
  PostgreSQLConnector,
  MongoDBConnector,
  OracleConnector,
  CassandraConnector,
} from "@/lib/replication/connectors";

export async function GET() {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    databases: {
      postgresql: { connected: false, error: null },
      mongodb: { connected: false, error: null },
      oracle: { connected: false, error: null },
      cassandra: { connected: false, error: null },
      redis: { connected: false, error: null },
    },
  };

  // Verificar PostgreSQL
  try {
    const pgClient = await PostgreSQLConnector.connect();
    await pgClient.query("SELECT 1");
    await pgClient.end();
    healthStatus.databases.postgresql.connected = true;
  } catch (error: any) {
    healthStatus.databases.postgresql.error = error.message;
  }

  // Verificar MongoDB
  try {
    const mongoClient = await MongoDBConnector.connect();
    await mongoClient.db().admin().ping();
    await mongoClient.close();
    healthStatus.databases.mongodb.connected = true;
  } catch (error: any) {
    healthStatus.databases.mongodb.error = error.message;
  }

  // Verificar Oracle
  try {
    const oracleConn = await OracleConnector.connect();
    await oracleConn.execute("SELECT 1 FROM DUAL");
    await oracleConn.close();
    healthStatus.databases.oracle.connected = true;
  } catch (error: any) {
    healthStatus.databases.oracle.error = error.message;
  }

  // Verificar Cassandra
  try {
    const cassandraClient = await CassandraConnector.connect();
    await cassandraClient.execute("SELECT now() FROM system.local");
    await cassandraClient.shutdown();
    healthStatus.databases.cassandra.connected = true;
  } catch (error: any) {
    healthStatus.databases.cassandra.error = error.message;
  }

  // Verificar Redis (a través de Bull)
  try {
    const Queue = (await import("bull")).default;
    const testQueue = new Queue("health-check", {
      redis: process.env.REDIS_URL!,
    });
    await testQueue.getJobCounts();
    await testQueue.close();
    healthStatus.databases.redis.connected = true;
  } catch (error: any) {
    healthStatus.databases.redis.error = error.message;
  }

  const allConnected = Object.values(healthStatus.databases).every(
    (db) => db.connected
  );

  return NextResponse.json(healthStatus, {
    status: allConnected ? 200 : 503,
  });
}
