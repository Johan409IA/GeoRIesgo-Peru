// src/lib/replication/worker.ts
import Queue from "bull";
import { replicationService } from "./services";

// Inicializar el worker solo en el servidor
if (typeof window === "undefined") {
  const queue = new Queue("multi-db-replication", {
    redis: process.env.REDIS_URL!,
  });

  queue.process(async (job) => {
    const { source, operation, data, entityType } = job.data;
    const timestamp = new Date().toISOString();

    console.log(`\n[${timestamp}] 🚀 Worker procesando trabajo:`);
    console.log(`   Job ID: ${job.id}`);
    console.log(`   Operación: ${operation}`);
    console.log(`   Entidad: ${entityType}`);
    console.log(`   Origen: ${source}`);
    console.log(`   Data ID: ${data.id}`);

    try {
      await replicationService.replicateToAllExceptSource(
        source,
        operation,
        data,
        entityType
      );
      console.log(
        `✅ [${timestamp}] Trabajo completado exitosamente (Job ID: ${job.id})`
      );
    } catch (error: any) {
      console.error(
        `\n❌ [${timestamp}] Error crítico en worker (Job ID: ${job.id}):`
      );
      console.error(`   Mensaje: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack trace: ${error.stack}`);
      }
      throw error; // Re-lanzar para que Bull maneje el reintento
    }
  });

  queue.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completado`);
  });

  queue.on("failed", (job, err) => {
    console.error(`❌ Job ${job.id} falló:`, err.message);
  });

  queue.on("error", (error) => {
    console.error("❌ Error en la cola de Bull:", error);
  });

  console.log("✅ Bull Worker iniciado para replicación");
}
