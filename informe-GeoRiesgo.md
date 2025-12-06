# INFORME TÉCNICO: ARQUITECTURA DE REPLICACIÓN DE DATOS
## Sistema GeoRiesgo Perú - Gestión Multi-Base de Datos

---

## 📋 RESUMEN EJECUTIVO

El proyecto **GeoRiesgo Perú** implementa un sistema de replicación de datos en tiempo real que mantiene sincronizadas **cuatro bases de datos diferentes**: PostgreSQL, MongoDB, Cassandra y Oracle. La arquitectura utiliza **Redis** como sistema de mensajería y **Bull** como gestor de colas de trabajos para orquestar la replicación asíncrona de datos.

**Estado Actual**: Según el README.md, **Oracle NO está replicando datos correctamente**.

---

## 🏗️ ARQUITECTURA GENERAL

### Diagrama de Flujo de Replicación

```
┌─────────────────┐
│   APLICACIÓN    │
│   (Next.js)     │
└────────┬────────┘
         │
         │ 1. Escribe en PostgreSQL (BD Principal)
         ▼
┌─────────────────┐
│   PostgreSQL    │ ◄─── Base de Datos Principal
│   (Puerto 5432) │
└────────┬────────┘
         │
         │ 2. Registra cambio en Redis
         ▼
┌─────────────────┐
│      Redis      │
│   (Puerto 6379) │ ◄─── Sistema de Mensajería
└────────┬────────┘
         │
         │ 3. Bull Queue procesa el trabajo
         ▼
┌─────────────────┐
│   Bull Worker   │ ◄─── Procesador de Trabajos
└────────┬────────┘
         │
         │ 4. Replica en paralelo a las demás BD
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│MongoDB │ │Cassandra│ │ Oracle │ │PostgreSQL│
│  :27017│ │  :9042 │ │ :1521  │ │  :5432 │
└────────┘ └────────┘ └────────┘ └────────┘
```

---

## 🔌 CONEXIÓN DE LAS 4 BASES DE DATOS

### 1. PostgreSQL (Base de Datos Principal)
**Archivo**: `src/lib/replication/connectors.ts` (líneas 8-14)

```typescript
export class PostgreSQLConnector {
  static async connect() {
    const client = new PGClient({ 
      connectionString: process.env.PG_URI 
    });
    await client.connect();
    return client;
  }
}
```

**Configuración** (`.env.local`):
```
PG_URI=postgresql://postgres:74904832Johan@localhost:5432/GeoRiesgo
```

**Características**:
- Utiliza el driver `pg` (PostgreSQL client)
- Actúa como base de datos principal donde se escriben primero todos los cambios
- Todas las operaciones de lectura (GET) se realizan desde PostgreSQL

---

### 2. MongoDB (Base de Datos NoSQL)
**Archivo**: `src/lib/replication/connectors.ts` (líneas 16-23)

```typescript
export class MongoDBConnector {
  static async connect() {
    const client = new MongoClient(process.env.MONGO_URI!);
    await client.connect();
    return client;
  }
}
```

**Configuración** (`.env.local`):
```
MONGO_URI=mongodb://Johan:12345@localhost:27017/GeoRiesgo?authSource=admin
```

**Características**:
- Utiliza el driver oficial `mongodb`
- Almacena datos en formato de documentos JSON
- Usa operaciones `updateOne` con `upsert: true` para INSERT/UPDATE

---

### 3. Oracle Database
**Archivo**: `src/lib/replication/connectors.ts` (líneas 25-41)

```typescript
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
```

**Configuración** (`.env.local`):
```
ORACLE_USER=C##TEST
ORACLE_PASSWORD=test409@
ORACLE_CONNECTION_STRING=localhost:1521/XE
```

---

### 4. Apache Cassandra (Base de Datos Distribuida)
**Archivo**: `src/lib/replication/connectors.ts` (líneas 44-62)

```typescript
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
```

**Configuración** (`.env.local`):
```
CASSANDRA_HOSTS=localhost:9042
CASSANDRA_KEYSPACE=georiesgo
CASSANDRA_USER=cassandra
CASSANDRA_PASSWORD=cassandra
CASSANDRA_DATACENTER=datacenter1
```

**Características**:
- Utiliza el driver `cassandra-driver`
- Base de datos distribuida diseñada para alta disponibilidad
- Usa prepared statements para mejor rendimiento

---

## 🔄 PROCESO DE REPLICACIÓN CON REDIS Y BULL

### Componentes Clave

#### 1. **Redis** (Sistema de Mensajería)
- **Puerto**: 6379
- **Función**: Actúa como broker de mensajes para Bull
- **Configuración**: `REDIS_URL=redis://localhost:6379`

#### 2. **Bull Queue** (Gestor de Colas)
- **Librería**: `bull` v4.16.5
- **Función**: Gestiona trabajos de replicación de forma asíncrona
- **Nombre de la cola**: `"multi-db-replication"`

---

### Flujo Detallado de Replicación

#### **PASO 1: Operación en la Aplicación**
Cuando un usuario crea, actualiza o elimina un registro (incidente, usuario o recurso), la aplicación ejecuta:

**Ejemplo**: Crear un incidente (`src/app/api/incidents/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  // 1. Validar datos
  const { title, description, status, ... } = await request.json();
  
  // 2. Generar ID único
  const incidentId = generateIncidentId(); // ej: "inc_lx5k2p_a3f9g1"
  
  // 3. ESCRIBIR PRIMERO EN POSTGRESQL (BD Principal)
  const client = await PostgreSQLConnector.connect();
  await client.query(
    "INSERT INTO incidents (...) VALUES (...)",
    [incidentId, title, description, ...]
  );
  await client.end();
  
  // 4. REGISTRAR CAMBIO PARA REPLICACIÓN
  await replicationService.recordChange(
    "postgresql",      // Base de datos origen
    "INSERT",          // Tipo de operación
    incidentData,      // Datos del incidente
    "incidents"        // Tipo de entidad
  );
}
```

---

#### **PASO 2: Registro en la Cola de Bull**
**Archivo**: `src/lib/replication/services.ts` (líneas 699-712)

```typescript
public async recordChange(
  source: string,
  operation: "INSERT" | "UPDATE" | "DELETE",
  data: IncidentData | userData | resourceData,
  entityType: "incidents" | "users" | "resources"
) {
  // Agregar trabajo a la cola de Bull
  await this.queue.add({
    source,           // "postgresql"
    operation,        // "INSERT"
    data,            // Datos completos del registro
    entityType,      // "incidents"
    timestamp: new Date(),
  });
}
```

**¿Qué hace Bull?**
- Serializa el trabajo y lo almacena en Redis
- Asigna un Job ID único (ej: `12345`)
- El trabajo queda en espera de ser procesado

---

#### **PASO 3: Procesamiento por el Worker**
**Archivo**: `src/lib/replication/worker.ts` (líneas 11-42)

El worker de Bull se ejecuta en segundo plano y procesa los trabajos:

```typescript
queue.process(async (job) => {
  const { source, operation, data, entityType } = job.data;
  
  console.log(`🚀 Worker procesando trabajo:`);
  console.log(`   Job ID: ${job.id}`);
  console.log(`   Operación: ${operation}`);
  console.log(`   Origen: ${source}`);
  
  // Llamar al servicio de replicación
  await replicationService.replicateToAllExceptSource(
    source,      // "postgresql"
    operation,   // "INSERT"
    data,        // Datos del incidente
    entityType   // "incidents"
  );
});
```

---

#### **PASO 4: Replicación en Paralelo**
**Archivo**: `src/lib/replication/services.ts` (líneas 53-118)

```typescript
public async replicateToAllExceptSource(
  source: string,
  operation: "INSERT" | "UPDATE" | "DELETE",
  data: IncidentData | userData | resourceData,
  entityType: "incidents" | "users" | "resources"
) {
  const dbTargets: Promise<void>[] = [];
  const dbNames: string[] = [];

  // Excluir la base de datos origen (PostgreSQL)
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

  // ✅ EJECUTAR TODAS LAS REPLICACIONES EN PARALELO
  const results = await Promise.allSettled(dbTargets);
  
  // Manejar resultados individuales
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`❌ Error replicando a ${dbNames[index]}`);
    } else {
      console.log(`✅ Replicación exitosa a ${dbNames[index]}`);
    }
  });
}
```

**Características Importantes**:
- **Ejecución en paralelo**: Usa `Promise.allSettled()` para replicar a todas las BD simultáneamente
- **Tolerancia a fallos**: Si una BD falla, las demás continúan
- **Exclusión de origen**: No replica a la BD que originó el cambio (evita bucles infinitos)

---

## 📊 ENTIDADES REPLICADAS

La aplicación replica tres tipos de entidades:

### 1. **Incidents (Incidentes)**
```typescript
interface IncidentData {
  id: string;                    // ej: "inc_lx5k2p_a3f9g1"
  title: string;                 // "Deslizamiento en Chosica"
  reportedBy: string;            // "Ana García"
  description: string;           // Descripción detallada
  status: "Activo" | "En Proceso" | "Cerrado";
  descriptiveLocation: string;   // "Carapongo, Chosica, Lima"
  latitud: number;               // -11.9701
  longitud: number;              // -76.8407
  updatedAt?: Date;
}
```

**Tablas en cada BD**:
- PostgreSQL: `incidents` (snake_case: `reported_by`, `descriptive_location`)
- MongoDB: Colección `incidents` (camelCase: `reportedBy`, `descriptiveLocation`)
- Oracle: `incidents` (snake_case con conversión de status)
- Cassandra: `incidents` (snake_case)

---

### 2. **Users (Usuarios)**
```typescript
interface userData {
  id: string;          // ej: "usr_lx5k3a_b4h8j2"
  fullName: string;    // "Juan Pérez"
  email: string;       // "juan@example.com"
  password: string;    // Hash de contraseña
  createdAt: Date;
}
```

---

### 3. **Resources (Recursos)**
```typescript
interface resourceData {
  id: string;          // ej: "res_lx5k4b_c5i9k3"
  name: string;        // "Brigada 001"
  type: string;        // "Rescate acuático"
  status: string;      // "Disponible" | "Asignado"
  createdAt: Date;
}
```

---

## 🔧 OPERACIONES SOPORTADAS

### 1. **INSERT (Crear)**
- Se ejecuta primero en PostgreSQL
- Luego se replica a las otras 3 bases de datos
- MongoDB usa `updateOne` con `upsert: true`
- Cassandra usa `INSERT` (que actúa como upsert)

### 2. **UPDATE (Actualizar)**
- Similar a INSERT
- MongoDB usa `updateOne` con `upsert: true`
- PostgreSQL, Oracle y Cassandra usan `UPDATE` directo

### 3. **DELETE (Eliminar)**
- Se ejecuta en todas las bases de datos
- Usa el `id` como clave primaria


---

### 2. **Generación de IDs Únicos**
**Archivo**: `src/lib/utils/id-generator.ts`

```typescript
export function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);  // Timestamp en base36
  const random = Math.random().toString(36).substring(2, 8);
  return `inc_${timestamp}_${random}`;  // ej: "inc_lx5k2p_a3f9g1"
}
```

**Ventajas**:
- IDs únicos globalmente
- Incluyen timestamp (útil para ordenamiento)
- Prefijos identifican el tipo de entidad (`inc_`, `usr_`, `res_`)

---

### 3. **Manejo de Errores**
El sistema implementa manejo robusto de errores:

```typescript
const results = await Promise.allSettled(dbTargets);

results.forEach((result, index) => {
  if (result.status === "rejected") {
    console.error(`❌ Error replicando a ${dbNames[index]}`);
    console.error(`   Mensaje: ${result.reason.message}`);
    // Logs específicos según la BD
    if (dbName === "Oracle" && result.reason.errorNum) {
      console.error(`   Oracle Error Code: ${result.reason.errorNum}`);
    }
  }
});
```

**Tolerancia a fallos**:
- Si Oracle falla, MongoDB y Cassandra continúan
- Los errores se registran en logs detallados
- El trabajo de Bull puede reintentarse automáticamente

---

### 3. **Reintentos Configurados**
Bull puede reintentar trabajos fallidos:

```typescript
// En services.ts constructor:
this.queue = new Queue("multi-db-replication", {
  redis: process.env.REDIS_URL!,
  defaultJobOptions: {
    attempts: 3,              // ✅ Reintentar 3 veces
    backoff: {
      type: 'exponential',    // ✅ Backoff exponencial
      delay: 2000             // ✅ Esperar 2s, 4s, 8s
    }
  }
});
```


---

## 📚 DEPENDENCIAS CLAVE

```json
{
  "bull": "^4.16.5",              // Gestor de colas
  "redis": "^5.10.0",             // Cliente Redis
  "pg": "^8.16.3",                // PostgreSQL driver
  "mongodb": "^7.0.0",            // MongoDB driver
  "oracledb": "^6.10.0",          // Oracle driver
  "cassandra-driver": "^4.8.0"   // Cassandra driver
}
```

---

## **Solución: Patrón Saga para Consistencia Inmediata**

### **Cómo funciona el patrón Saga:**

**Concepto básico:** Un Saga es una secuencia de transacciones locales donde cada transacción actualiza una base de datos y publica un evento que desencadena la siguiente transacción. Si una transacción falla, el Saga ejecuta transacciones de compensación en orden inverso para deshacer los cambios.

**Tu escenario actual:**
1. Escribes en PostgreSQL (éxito)
2. Intentas escribir en MongoDB (falla)
3. Los datos quedan inconsistentes (PostgreSQL tiene datos que MongoDB no tiene)

**Con Saga:**
1. Escribes en PostgreSQL (éxito) ✅
2. Intentas escribir en MongoDB (falla) ❌
3. **Compensación automática:** Vuelves a PostgreSQL y deshaces el cambio
4. Estado final: Ninguna base de datos tiene el dato (consistencia)

**Pasos detallados:**
1. **Transacción 1:** Escribe en PostgreSQL → Si falla, se cancela todo
2. **Transacción 2:** Escribe en MongoDB → Si falla, se ejecuta compensación 1
3. **Transacción 3:** Escribe en Cassandra → Si falla, se ejecutan compensaciones 2 y 1
4. **Transacción 4:** Escribe en Oracle → Si falla, se ejecutan compensaciones 3, 2 y 1

**Ventajas:**
- Garantiza que todas las bases de datos tengan los mismos datos o ninguna los tenga
- Evita datos "huérfanos" en algunas bases de datos
- Consistencia inmediata entre sistemas

**Desventajas:**
- Más complejidad (necesitas lógica de compensación para cada operación)
- Si la compensación falla, necesitas mecanismos adicionales

---

## **Solución cuando PostgreSQL falla (Plan de Contingencia)**

### **Escenario:** PostgreSQL está caído o no responde

### **Plan de 4 niveles:**

#### **Nivel 1: Detección y Desvío Inmediato**
- **Circuit Breaker:** Detecta que PostgreSQL no responde después de X intentos
- **Switch automático:** El tráfico de escritura se desvía a un **"Líder Temporal"**
- **Elección del líder:** MongoDB o Cassandra (la que tenga mejor rendimiento y consistencia)

#### **Nivel 2: Almacenamiento Temporal Estructurado**
1. **Base de datos temporal:** Se designa MongoDB como almacén temporal principal
2. **Estructura especial:** 
   - Cada registro lleva metadatos: `{data: ..., source: 'temp', postgres_pending: true, timestamp: ...}`
   - Se registra en una **"cola de sincronización pendiente"**
3. **Operaciones continúan:** Los usuarios pueden seguir creando/actualizando datos

#### **Nivel 3: Sincronización Diferida**
1. **Worker de sincronización:** Proceso que intenta periódicamente:
   - Conectarse a PostgreSQL (cada 30 segundos)
   - Si PostgreSQL responde:
     a. Tomar los datos del almacén temporal
     b. Escribirlos en PostgreSQL en el orden correcto (por timestamp)
     c. Una vez en PostgreSQL, replicar a las otras bases de datos
     d. Marcar como sincronizado en el almacén temporal

2. **Mecanismo de reintentos:** 
   - Intento 1: Inmediato (cuando PostgreSQL vuelve)
   - Intento 2: 5 minutos después
   - Intento 3: 30 minutos después
   - Intento 4: 1 hora después → Alerta humana

#### **Nivel 4: Conmutación de Retorno y Consistencia**
1. **Cuando PostgreSQL vuelve:**
   - Primero: Sincronizar todos los datos pendientes
   - Segundo: Verificar consistencia entre bases de datos
   - Tercero: Volver a designar PostgreSQL como principal

2. **Resolución de conflictos:**
   - Si el mismo dato fue modificado en PostgreSQL (antes de caer) y en el almacén temporal:
     - Usar timestamp más reciente
     - O aplicar lógica de negocios específica
     - Registrar el conflicto para revisión

### **Proceso de Lectura durante la caída:**
1. **GET requests:**
   - Intentar leer de PostgreSQL primero
   - Si falla, leer del almacén temporal (MongoDB)
   - Mostrar indicador: "Datos en modo de respaldo"

2. **Transparencia para el usuario:**
   - La aplicación sigue funcionando
   - Puede haber pequeñas diferencias en datos muy recientes

### **Ventajas de este plan:**
1. **Alta disponibilidad:** El sistema nunca se cae completamente
2. **Durabilidad de datos:** Los datos nunca se pierden
3. **Consistencia eventual:** Todos los sistemas terminan sincronizados
4. **Recuperación automática:** Sin intervención manual necesaria

### **Riesgos mitigados:**
- ✅ **Datos perdidos:** Se almacenan temporalmente
- ✅ **Inconsistencias:** Se sincronizan cuando PostgreSQL vuelve
- ✅ **Downtime prolongado:** Los usuarios pueden seguir usando la app
- ✅ **Conflictos:** Se detectan y resuelven automáticamente

### **Estado ideal post-recuperación:**
1. PostgreSQL tiene todos los datos
2. Las otras 3 bases de datos están replicadas
3. El almacén temporal está vacío o archivado
4. Sistema vuelve a operación normal automáticamente

**¿Qué pasa si el almacén temporal también falla?** 
- Se activaría un tercer nivel: Cassandra como respaldo del respaldo
- Y finalmente, registro en archivo local hasta que algo se recupere

Este plan garantiza que **nunca** pierdas datos y que el sistema siempre esté disponible, aunque con diferentes niveles de consistencia durante la contingencia.

---

## 🎓 CONCLUSIONES

### Fortalezas del Sistema
1. ✅ **Arquitectura desacoplada**: Redis y Bull permiten replicación asíncrona
2. ✅ **Tolerancia a fallos**: Una BD puede fallar sin afectar las demás
3. ✅ **Escalabilidad**: Bull puede distribuir trabajos entre múltiples workers
4. ✅ **Logging detallado**: Fácil diagnóstico de problemas
5. ✅ **Ejecución paralela**: Replicación simultánea mejora el rendimiento

---
