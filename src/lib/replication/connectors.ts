// src/lib/replication/connectors.ts
import { Client as PGClient } from "pg";
import { MongoClient } from "mongodb";
import * as oracledb from "oracledb";
import * as cassandra from "cassandra-driver";

// PostgreSQL Connector
export class PostgreSQLConnector {
  static async connect() {
    const client = new PGClient({ connectionString: process.env.PG_URI });
    await client.connect();
    return client;
  }
}

// MongoDB Connector
export class MongoDBConnector {
  static async connect() {
    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    return client;
  }
}

// Oracle Connector
export class OracleConnector {
  static async connect() {
    console.log("Intentando conectar a Oracle con:", {
      user: "C##TEST",
      password: "test409@",
      connectString: "localhost:1521/XE",
    });

    const connection = await oracledb.getConnection({
      user: "C##TEST",
      password: "test409@",
      connectString: "localhost:1521/XE",
    });
    return connection;
  }
}


// Cassandra Connector
export class CassandraConnector {
  static client: cassandra.Client;

  static async connect() {
    this.client = new cassandra.Client({
      contactPoints: [process.env.CASSANDRA_HOSTS!],
      localDataCenter: process.env.CASSANDRA_DATACENTER!,
      keyspace: process.env.CASSANDRA_KEYSPACE!,
      authProvider: new cassandra.auth.PlainTextAuthProvider(
        process.env.CASSANDRA_USER || "cassandra",
        process.env.CASSANDRA_PASSWORD || "cassandra"
      ),
    });

    await this.client.connect();
    return this.client;
  }
}
