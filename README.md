
# GeoRIesgo-Peru

GeoRIesgo-Peru es una aplicación web desarrollada en **TypeScript** y **Next.js** diseñada para la gestión y análisis de riesgo geoespacial en Perú.  
El sistema permite monitorear incidentes, visualizar información georreferenciada y coordinar recursos para su atención y mitigación.

---

## 🛰️ ¿Qué hace este proyecto?

La aplicación proporciona:

- Una interfaz web para registrar y visualizar incidentes geoespaciales.
- Gestión de información asociada a zonas de riesgo.
- Administración de recursos y entidades relacionadas.
- Integración con múltiples motores de base de datos:
  - **PostgreSQL**
  - **MongoDB**
  - **Cassandra**
  - **Oracle**
  - *(Opcional)* **Redis** para caching o colas

Su arquitectura permite almacenar, consultar y combinar datos distribuidos en diferentes sistemas, ofreciendo flexibilidad y rendimiento para análisis geoespacial complejo.

---

## 🛠️ Requisitos previos

Antes de ejecutar el proyecto, asegúrate de contar con:

- **Node.js** (versión recomendada según tu entorno)
- **npm** o **pnpm**
- Acceso a las bases de datos que vayas a utilizar:
  - PostgreSQL  
  - MongoDB  
  - Cassandra  
  - Oracle  
- *(Opcional)* Redis si deseas usar funcionalidades adicionales

---

## ⚡ Instalación y ejecución (rápido)

```bash
# Clonar el repositorio
git clone https://github.com/Johan409IA/GeoRIesgo-Peru.git
cd GeoRIesgo-Peru

# Cambiar a la rama principal
git checkout main

# Instalar dependencias
npm install

# Crear archivo de variables de entorno
# Copia el ejemplo de abajo en .env.local y reemplaza con tus credenciales
touch .env.local

# Iniciar en modo desarrollo
npm run dev
````

---

## 🔐 Variables de entorno (.env.local)

> ⚠️ **IMPORTANTE**: No subas el archivo `.env.local` al repositorio.
> Usa valores reales solo en tu entorno personal.

```env
###################################
#    Variables de entorno — EJEMPLO
###################################

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# PostgreSQL
PG_URI=postgresql://user:password@localhost:5432/georiesgo_db

# MongoDB
MONGO_URI=mongodb://user:password@localhost:27017/georiesgo_db?authSource=admin

# Oracle
ORACLE_USER=MYUSER
ORACLE_PASSWORD=MYPASSWORD
ORACLE_CONNECTION_STRING=localhost:1521/XEPDB1

# Cassandra
CASSANDRA_HOSTS=localhost:9042
CASSANDRA_KEYSPACE=georiesgo
CASSANDRA_USER=cassandra
CASSANDRA_PASSWORD=cassandra
CASSANDRA_DATACENTER=datacenter1
```

> Ajusta estas variables según las bases de datos que realmente utilizarás.

---

## 📁 Archivos relevantes del proyecto

* **`package.json`** — Dependencias y scripts del proyecto.
* **`next.config.ts`** — Configuración principal de Next.js.
* **`src/`** — Código fuente del sistema y lógica de negocio.

---

## ✔️ Buenas prácticas recomendadas

* Crear y configurar tu archivo `.env.local` en la raíz del proyecto.
* Nunca subir credenciales reales al repositorio.
* Mantener separadas las configuraciones de entorno (dev, prod, test).
* Documentar tus cambios y mantener el README actualizado.

---

## ⚠️ Consideración sobre la conexión con Oracle

En el archivo:

```
GeoRiesgo/src/lib/replication/connectors.ts
```

La conexión con Oracle está escrita actualmente con credenciales en texto plano debido a problemas iniciales con la carga de variables de entorno.
Si deseas mejorar la seguridad del proyecto:

➡️ **Cambia las credenciales en texto plano por las variables definidas en `.env.local`, igual que en los otros motores de base de datos.**

Esto hará que la configuración sea más consistente y segura.



