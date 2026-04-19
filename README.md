# FEOEs FP Aragón

Aplicación web para la gestión de las **Formación en Empresa u Organismo Equiparado (FEOE)** en centros de Formación Profesional de Aragón. Permite hacer seguimiento completo de alumnos, empresas colaboradoras, tutores y estancias formativas.

---

## Características generales

- Aplicación web accesible desde cualquier navegador, sin instalación en el equipo del usuario
- Arquitectura cliente-servidor: frontend Nginx + backend Express + base de datos SQLite
- Autenticación segura mediante JWT
- Registro de auditoría (historial de todas las acciones)
- Sistema de solicitudes con aprobación por parte del administrador
- Compatible con Docker en cualquier plataforma (Linux, Windows, macOS, CasaOS)

---

## Características particulares

- Gestión completa de **alumnos**: datos personales, ciclo formativo, tutor asignado
- Gestión de **empresas** colaboradoras: datos de contacto, CIF, historial de estancias
- Gestión de **estancias**: fechas, empresa, tutor de empresa, valoraciones
- **Mapa interactivo** de empresas colaboradoras
- Exportación de datos a **Excel**
- **Solicitudes de eliminación**: los profesores solicitan, el admin aprueba o rechaza
- Historial de auditoría completo con todas las operaciones realizadas

---

## Instalación y arranque

**Requisitos:** Docker + Docker Compose

```bash
# 1. Clonar el repositorio
git clone https://github.com/luisjsolsona/FEOEs-FP-Aragon.git
cd FEOEs-FP-Aragon

# 2. Crear el fichero de configuración
cp .env.example .env
# Edita .env y cambia JWT_SECRET y ADMIN_PASSWORD por valores propios

# 3. Construir y arrancar
docker compose up -d --build
```

Acceder en: **http://localhost:5000**

La base de datos se crea automáticamente en `./data/feoe.sqlite` en el primer arranque.

```bash
# Arranques posteriores
docker compose up -d

# Ver logs
docker compose logs -f

# Parar
docker compose down

# Actualizar tras git pull
docker compose up -d --build
```

---

## Credenciales por defecto

| Usuario | Contraseña  |
|---------|-------------|
| `admin` | `admin1234` |

> ⚠️ Cambia la contraseña tras el primer inicio de sesión en `Usuarios → ··· → Cambiar contraseña`.

Edita `.env` para establecer credenciales propias antes del primer arranque:

```env
JWT_SECRET=cadena_larga_y_aleatoria
ADMIN_PASSWORD=contraseña_segura
```

---

## Roles / Permisos

| Acción | Admin | Profesor |
|--------|:-----:|:--------:|
| Ver alumnos y estancias | ✅ | ✅ |
| Crear / editar alumnos y estancias | ✅ | ✅ |
| Eliminar alumnos o estancias | ✅ | 🔄 requiere aprobación |
| Gestionar empresas | ✅ | ✅ |
| Aprobar / rechazar solicitudes | ✅ | ❌ |
| Ver historial de auditoría | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ |

---

## Arquitectura

```
FEOEs-FP-Aragon/
├── docker-compose.yml          # Orquestación: backend + frontend (Nginx)
├── .env.example                # Plantilla de variables de entorno
├── backend/
│   ├── Dockerfile
│   ├── server.js               # API REST Express.js
│   └── routes/                 # Rutas: auth, alumnado, empresas, estancias, usuarios
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf              # Proxy /api/* → backend
│   ├── icon.svg                # Icono de la aplicación
│   ├── api.js                  # Cliente API compartido
│   └── index.html              # SPA completa en un único fichero
└── data/
    └── feoe.sqlite             # Base de datos (generada al arrancar, persistente)
```

**Stack:** Node.js · Express · SQLite · Nginx · Docker

---

## Despliegue en CasaOS

1. Clona el repositorio en tu servidor CasaOS:
   ```bash
   git clone https://github.com/luisjsolsona/FEOEs-FP-Aragon.git
   ```
2. Crea el fichero `.env` a partir de `.env.example` y edita las credenciales
3. En la UI de CasaOS ve a **App Store → Custom Install → Import docker-compose**
4. Selecciona el fichero `docker-compose.yml` del repositorio clonado
5. CasaOS detectará automáticamente el nombre, descripción e icono de la app
6. Accede en `http://<ip-casaos>:5000`

> ⚠️ Edita `.env` con tu propio `JWT_SECRET` y `ADMIN_PASSWORD` antes de arrancar en producción.
