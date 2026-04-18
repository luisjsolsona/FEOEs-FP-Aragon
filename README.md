# FEOE FP Aragón — Versión Docker

Aplicación de gestión de **Formación en Empresa u Organismo Equiparado** para centros de FP en Aragón.

## Arquitectura

```
┌─────────────────────────────────────┐
│  Navegador (puerto 5000)            │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│  Nginx (feoe_frontend)              │
│  · Sirve index.html y api.js        │
│  · Proxy /api/* → backend           │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│  Express + SQLite (feoe_backend)    │
│  · API REST JWT                     │
│  · BD: ./data/feoe.sqlite           │
└─────────────────────────────────────┘
```

## Instalación y arranque

```bash
# 1. Clonar el repositorio
git clone https://github.com/luisjsolsona/FEOEs-FP-Aragon.git
cd FEOEs-FP-Aragon

# 2. Crear el fichero de configuración a partir de la plantilla
cp .env.example .env
# Edita .env y cambia JWT_SECRET y ADMIN_PASSWORD por valores propios

# 3. Arrancar los contenedores
docker-compose up -d

# 4. Abrir en el navegador
http://localhost:5000
```

Login por defecto: `admin` / `admin1234`

> ⚠️ Cambia la contraseña tras el primer inicio de sesión (`Usuarios → ··· → Cambiar contraseña`).

## Comandos útiles

```bash
docker-compose logs -f          # Ver logs en tiempo real
docker-compose down             # Parar
docker-compose up -d --build    # Reconstruir imágenes
```

## Datos persistentes

La base de datos SQLite se guarda en `./data/feoe.sqlite`.  
Haz copia de esta carpeta para tener backups.

## Roles

| Rol        | Puede hacer                                                        |
|------------|--------------------------------------------------------------------|
| **Admin**  | Todo: crear/editar/eliminar alumnos, empresas, aprobar solicitudes, gestionar usuarios |
| **Profesor**| Crear/editar alumnos y estancias; solicitar eliminaciones (requieren aprobación admin) |

## API REST

| Método | Ruta                         | Descripción                    |
|--------|------------------------------|--------------------------------|
| POST   | /api/auth/login              | Iniciar sesión                 |
| POST   | /api/auth/logout             | Cerrar sesión                  |
| GET    | /api/auth/me                 | Usuario actual                 |
| GET    | /api/alumnado                | Listar alumnos con estancias   |
| POST   | /api/alumnado                | Crear/actualizar alumno (DNI)  |
| POST   | /api/alumnado/bulk-delete    | Eliminar varios (admin)        |
| GET    | /api/empresas                | Listar empresas                |
| POST   | /api/empresas                | Crear/actualizar empresa (CIF) |
| POST   | /api/estancias               | Crear/actualizar estancia      |
| GET    | /api/pendientes              | Listar solicitudes             |
| POST   | /api/pendientes              | Solicitar eliminación          |
| PUT    | /api/pendientes/:id/resolver | Aprobar/rechazar (admin)       |
| GET    | /api/historial               | Registro de auditoría          |
| GET    | /api/users                   | Listar usuarios (admin)        |
| POST   | /api/users                   | Crear usuario (admin)          |
