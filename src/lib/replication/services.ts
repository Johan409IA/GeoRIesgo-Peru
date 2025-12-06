// src/lib/replication/service.ts
type IncidentStatus = "Activo" | "En Proceso" | "Cerrado";

import Queue from "bull";
import {
  PostgreSQLConnector,
  MongoDBConnector,
  OracleConnector,
  CassandraConnector,
} from "./connectors";
import { mapStatusToEnglish } from "@/lib/utils/status-mapper";

export interface userData {
  id: string;
  fullName: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface IncidentData {
  id: string;
  title: string;
  reportedBy: string;
  description: string;
  status: IncidentStatus;
  descriptiveLocation: string;
  latitud: number;
  longitud: number;
  updatedAt?: Date;
}

export interface resourceData {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: Date;
}

export class ReplicationService {
  private queue: Queue.Queue;

  constructor() {
    this.queue = new Queue("multi-db-replication", {
      redis: process.env.REDIS_URL!,
    });

    console.log("🔄 Servicio de replicación iniciado");
  }

  // Método público para que el worker pueda llamarlo
  public async replicateToAllExceptSource(
    source: string,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData | userData | resourceData,
    entityType: "incidents" | "users" | "resources"
  ) {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] 🔄 Iniciando replicación desde ${source}`);
    console.log(`   Operación: ${operation}`);
    console.log(`   Tipo de entidad: ${entityType}`);
    console.log(`   ID: ${data.id}`);

    const dbTargets: Promise<void>[] = [];
    const dbNames: string[] = [];

    if (source !== "postgresql") {
      dbTargets.push(this.replicateToPostgreSQL(operation, data, entityType));
      dbNames.push("PostgreSQL");
    }
    if (source !== "mongodb") {
      dbTargets.push(this.replicateToMongoDB(operation, data, entityType));
      dbNames.push("MongoDB");
    }
    if (source !== "oracle") {
      dbTargets.push(this.replicateToOracle(operation, data, entityType));
      dbNames.push("Oracle");
    }
    if (source !== "cassandra") {
      dbTargets.push(this.replicateToCassandra(operation, data, entityType));
      dbNames.push("Cassandra");
    }

    // Ejecutar todas en paralelo y manejar errores individualmente
    const results = await Promise.allSettled(dbTargets);

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      const dbName = dbNames[index];
      if (result.status === "rejected") {
        failureCount++;
        console.error(`\n❌ [${timestamp}] Error replicando a ${dbName}:`);
        console.error(`   Mensaje: ${result.reason.message || result.reason}`);
        if (result.reason.stack) {
          console.error(`   Stack trace: ${result.reason.stack}`);
        }
        // Log detalles adicionales según la base de datos
        if (dbName === "Oracle" && result.reason.errorNum) {
          console.error(`   Oracle Error Code: ${result.reason.errorNum}`);
        }
        if (dbName === "Cassandra" && result.reason.info) {
          console.error(
            `   Cassandra Info: ${JSON.stringify(result.reason.info)}`
          );
        }
      } else {
        successCount++;
        console.log(`✅ [${timestamp}] Replicación exitosa a ${dbName}`);
      }
    });

    console.log(`\n📊 [${timestamp}] Resumen de replicación:`);
    console.log(`   ✅ Exitosas: ${successCount}/${dbNames.length}`);
    console.log(`   ❌ Fallidas: ${failureCount}/${dbNames.length}`);
  }

  // Métodos de replicación para PostgreSQL
  private async replicateToPostgreSQL(
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData | userData | resourceData,
    entityType: "incidents" | "users" | "resources"
  ) {
    const client = await PostgreSQLConnector.connect();
    try {
      console.log(`   🔵 Conectando a PostgreSQL...`);
      switch (entityType) {
        case "incidents":
          await this.handleIncidentPostgreSQL(
            client,
            operation,
            data as IncidentData
          );
          break;
        case "users":
          await this.handleUserPostgreSQL(client, operation, data as userData);
          break;
        case "resources":
          await this.handleResourcePostgreSQL(
            client,
            operation,
            data as resourceData
          );
          break;
      }
    } catch (error: any) {
      console.error(`   ❌ Error en PostgreSQL: ${error.message}`);
      throw error;
    } finally {
      await client.end();
    }
  }

  private async handleIncidentPostgreSQL(
    client: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData
  ) {
    switch (operation) {
      case "INSERT":
        await client.query(
          `INSERT INTO incidents (id, title, reported_by, description, status, descriptive_location, latitud, longitud, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            data.id,
            data.title,
            data.reportedBy,
            data.description,
            data.status,
            data.descriptiveLocation,
            data.latitud,
            data.longitud,
            new Date(),
            data.updatedAt || new Date(),
          ]
        );
        break;
      case "UPDATE":
        await client.query(
          `UPDATE incidents SET title=$1, reported_by=$2, description=$3, status=$4, descriptive_location=$5, latitud=$6, longitud=$7, updated_at=$8
           WHERE id=$9`,
          [
            data.title,
            data.reportedBy,
            data.description,
            data.status,
            data.descriptiveLocation,
            data.latitud,
            data.longitud,
            data.updatedAt || new Date(),
            data.id,
          ]
        );
        break;
      case "DELETE":
        await client.query("DELETE FROM incidents WHERE id=$1", [data.id]);
        break;
    }
  }

  private async handleUserPostgreSQL(
    client: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: userData
  ) {
    switch (operation) {
      case "INSERT":
        await client.query(
          `INSERT INTO users (id, full_name, email, password, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [data.id, data.fullName, data.email, data.password, data.createdAt]
        );
        break;
      case "UPDATE":
        await client.query(
          `UPDATE users SET full_name=$1, email=$2, password=$3
           WHERE id=$4`,
          [data.fullName, data.email, data.password, data.id]
        );
        break;
      case "DELETE":
        await client.query("DELETE FROM users WHERE id=$1", [data.id]);
        break;
    }
  }

  private async handleResourcePostgreSQL(
    client: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: resourceData
  ) {
    switch (operation) {
      case "INSERT":
        await client.query(
          `INSERT INTO resources (id, name, type, status, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [data.id, data.name, data.type, data.status, data.createdAt]
        );
        break;
      case "UPDATE":
        await client.query(
          `UPDATE resources SET name=$1, type=$2, status=$3
           WHERE id=$4`,
          [data.name, data.type, data.status, data.id]
        );
        break;
      case "DELETE":
        await client.query("DELETE FROM resources WHERE id=$1", [data.id]);
        break;
    }
  }

  // Métodos de replicación para MongoDB
  private async replicateToMongoDB(
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData | userData | resourceData,
    entityType: "incidents" | "users" | "resources"
  ) {
    const client = await MongoDBConnector.connect();
    const collection = client.db().collection(entityType);

    try {
      console.log(`   🟢 Conectando a MongoDB...`);
      switch (entityType) {
        case "incidents":
          await this.handleIncidentMongoDB(
            collection,
            operation,
            data as IncidentData
          );
          break;
        case "users":
          await this.handleUserMongoDB(collection, operation, data as userData);
          break;
        case "resources":
          await this.handleResourceMongoDB(
            collection,
            operation,
            data as resourceData
          );
          break;
      }
    } catch (error: any) {
      console.error(`   ❌ Error en MongoDB: ${error.message}`);
      throw error;
    } finally {
      await client.close();
    }
  }

  private async handleIncidentMongoDB(
    collection: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData
  ) {
    switch (operation) {
      case "INSERT":
      case "UPDATE":
        await collection.updateOne(
          { _id: data.id },
          {
            $set: {
              _id: data.id,
              title: data.title,
              reportedBy: data.reportedBy,
              description: data.description,
              status: data.status,
              descriptiveLocation: data.descriptiveLocation,
              latitud: data.latitud,
              longitud: data.longitud,
              updatedAt: data.updatedAt || new Date(),
            },
          },
          { upsert: true }
        );
        break;
      case "DELETE":
        await collection.deleteOne({ _id: data.id });
        break;
    }
  }

  private async handleUserMongoDB(
    collection: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: userData
  ) {
    switch (operation) {
      case "INSERT":
      case "UPDATE":
        await collection.updateOne(
          { _id: data.id },
          {
            $set: {
              _id: data.id,
              fullName: data.fullName,
              email: data.email,
              password: data.password,
              createdAt: data.createdAt,
            },
          },
          { upsert: true }
        );
        break;
      case "DELETE":
        await collection.deleteOne({ _id: data.id });
        break;
    }
  }

  private async handleResourceMongoDB(
    collection: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: resourceData
  ) {
    switch (operation) {
      case "INSERT":
      case "UPDATE":
        await collection.updateOne(
          { _id: data.id },
          {
            $set: {
              _id: data.id,
              name: data.name,
              type: data.type,
              status: data.status,
              createdAt: data.createdAt,
            },
          },
          { upsert: true }
        );
        break;
      case "DELETE":
        await collection.deleteOne({ _id: data.id });
        break;
    }
  }

  // Métodos de replicación para Oracle
  private async replicateToOracle(
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData | userData | resourceData,
    entityType: "incidents" | "users" | "resources"
  ) {
    const connection = await OracleConnector.connect();

    try {
      console.log(`   🟠 Conectando a Oracle...`);
      switch (entityType) {
        case "incidents":
          await this.handleIncidentOracle(
            connection,
            operation,
            data as IncidentData
          );
          break;
        case "users":
          await this.handleUserOracle(connection, operation, data as userData);
          break;
        case "resources":
          await this.handleResourceOracle(
            connection,
            operation,
            data as resourceData
          );
          break;
      }
      await connection.commit();
    } catch (error: any) {
      console.error(`   ❌ Error en Oracle: ${error.message}`);
      if (error.errorNum) {
        console.error(`   Oracle Error Code: ${error.errorNum}`);
      }
      throw error;
    } finally {
      await connection.close();
    }
  }

  private async handleIncidentOracle(
    connection: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData
  ) {
    // Normalizar fechas a objetos Date
    const now = new Date();
    const createdAt = (data as any).createdAt
      ? new Date((data as any).createdAt as any)
      : now;
    const updatedAt = (data as any).updatedAt
      ? new Date((data as any).updatedAt as any)
      : now;

    // Normalizar status: si viene en español lo convertimos a los códigos
    // en inglés usados típicamente en los esquemas de BD (`open`, `in_progress`, `closed`).
    let normalizedStatus: string = (data as any).status;
    if (
      normalizedStatus === "Activo" ||
      normalizedStatus === "En Proceso" ||
      normalizedStatus === "Cerrado"
    ) {
      normalizedStatus = mapStatusToEnglish(
        normalizedStatus as "Activo" | "En Proceso" | "Cerrado"
      );
    }

    switch (operation) {
      case "INSERT":
        await connection.execute(
          `INSERT INTO incidents (id, title, reported_by, description, status, descriptive_location, latitud, longitud, created_at, updated_at)
           VALUES (:id, :title, :reported_by, :description, :status, :descriptive_location, :latitud, :longitud, :created_at, :updated_at)`,
          {
            id: data.id,
            title: data.title,
            reported_by: data.reportedBy,
            description: data.description,
            status: normalizedStatus,
            descriptive_location: data.descriptiveLocation,
            latitud: data.latitud,
            longitud: data.longitud,
            created_at: createdAt,
            updated_at: updatedAt,
          }
        );
        break;
      case "UPDATE":
        await connection.execute(
          `UPDATE incidents SET title=:title, reported_by=:reported_by, description=:description, status=:status, descriptive_location=:descriptive_location, latitud=:latitud, longitud=:longitud, updated_at=:updated_at
           WHERE id=:id`,
          {
            title: data.title,
            reported_by: data.reportedBy,
            description: data.description,
            status: normalizedStatus,
            descriptive_location: data.descriptiveLocation,
            latitud: data.latitud,
            longitud: data.longitud,
            updated_at: updatedAt,
            id: data.id,
          }
        );
        break;
      case "DELETE":
        await connection.execute(`DELETE FROM incidents WHERE id=:id`, {
          id: data.id,
        });
        break;
    }
  }

  private async handleUserOracle(
    connection: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: userData
  ) {
    const createdAt = (data as any).createdAt
      ? new Date((data as any).createdAt as any)
      : new Date();

    switch (operation) {
      case "INSERT":
        await connection.execute(
          `INSERT INTO users (id, full_name, email, password, created_at)
           VALUES (:id, :full_name, :email, :password, :created_at)`,
          {
            id: data.id,
            full_name: data.fullName,
            email: data.email,
            password: data.password,
            created_at: createdAt,
          }
        );
        break;
      case "UPDATE":
        await connection.execute(
          `UPDATE users SET full_name=:full_name, email=:email, password=:password
           WHERE id=:id`,
          {
            full_name: data.fullName,
            email: data.email,
            password: data.password,
            id: data.id,
          }
        );
        break;
      case "DELETE":
        await connection.execute(`DELETE FROM users WHERE id=:id`, {
          id: data.id,
        });
        break;
    }
  }

  private async handleResourceOracle(
    connection: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: resourceData
  ) {
    const createdAt = (data as any).createdAt
      ? new Date((data as any).createdAt as any)
      : new Date();

    switch (operation) {
      case "INSERT":
        await connection.execute(
          `INSERT INTO resources (id, name, type, status, created_at)
           VALUES (:id, :name, :type, :status, :created_at)`,
          {
            id: data.id,
            name: data.name,
            type: data.type,
            status: data.status,
            created_at: createdAt,
          }
        );
        break;
      case "UPDATE":
        await connection.execute(
          `UPDATE resources SET name=:name, type=:type, status=:status
           WHERE id=:id`,
          {
            name: data.name,
            type: data.type,
            status: data.status,
            id: data.id,
          }
        );
        break;
      case "DELETE":
        await connection.execute(`DELETE FROM resources WHERE id=:id`, {
          id: data.id,
        });
        break;
    }
  }

  // Métodos de replicación para Cassandra
  private async replicateToCassandra(
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData | userData | resourceData,
    entityType: "incidents" | "users" | "resources"
  ) {
    const client = await CassandraConnector.connect();

    try {
      console.log(`   🟣 Conectando a Cassandra...`);
      switch (entityType) {
        case "incidents":
          await this.handleIncidentCassandra(
            client,
            operation,
            data as IncidentData
          );
          break;
        case "users":
          await this.handleUserCassandra(client, operation, data as userData);
          break;
        case "resources":
          await this.handleResourceCassandra(
            client,
            operation,
            data as resourceData
          );
          break;
      }
    } catch (error: any) {
      console.error(`   ❌ Error en Cassandra: ${error.message}`);
      if (error.info) {
        console.error(`   Cassandra Info: ${JSON.stringify(error.info)}`);
      }
      throw error;
    } finally {
      await client.shutdown();
    }
  }

  private async handleIncidentCassandra(
    client: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData
  ) {
    switch (operation) {
      case "INSERT":
      case "UPDATE":
        await client.execute(
          `INSERT INTO incidents (id, title, reported_by, description, status, descriptive_location, latitud, longitud, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.id,
            data.title,
            data.reportedBy,
            data.description,
            data.status,
            data.descriptiveLocation,
            data.latitud,
            data.longitud,
            new Date(),
            data.updatedAt || new Date(),
          ],
          { prepare: true }
        );
        break;
      case "DELETE":
        await client.execute(`DELETE FROM incidents WHERE id = ?`, [data.id], {
          prepare: true,
        });
        break;
    }
  }

  private async handleUserCassandra(
    client: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: userData
  ) {
    switch (operation) {
      case "INSERT":
      case "UPDATE":
        await client.execute(
          `INSERT INTO users (id, full_name, email, password, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [data.id, data.fullName, data.email, data.password, data.createdAt],
          { prepare: true }
        );
        break;
      case "DELETE":
        await client.execute(`DELETE FROM users WHERE id = ?`, [data.id], {
          prepare: true,
        });
        break;
    }
  }

  private async handleResourceCassandra(
    client: any,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: resourceData
  ) {
    switch (operation) {
      case "INSERT":
      case "UPDATE":
        await client.execute(
          `INSERT INTO resources (id, name, type, status, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [data.id, data.name, data.type, data.status, data.createdAt],
          { prepare: true }
        );
        break;
      case "DELETE":
        await client.execute(`DELETE FROM resources WHERE id = ?`, [data.id], {
          prepare: true,
        });
        break;
    }
  }

  public async recordChange(
    source: string,
    operation: "INSERT" | "UPDATE" | "DELETE",
    data: IncidentData | userData | resourceData,
    entityType: "incidents" | "users" | "resources"
  ) {
    await this.queue.add({
      source,
      operation,
      data,
      entityType,
      timestamp: new Date(),
    });
  }
}

// Exportar una instancia única (Singleton)
export const replicationService = new ReplicationService();
