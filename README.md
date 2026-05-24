# Task Calendar

Una aplicación web de gestión de tareas con soporte para recurrencia flexible, completamientos y modificaciones puntuales. Construida con Quasar, Vue 3, TypeScript y Supabase.

## Características

- Tareas puntuales y recurrentes (RRule RFC 5545)
- Calendario interactivo
- Completamientos y seguimiento
- Modificaciones de ocurrencias individuales
- Categorías con colores e iconos
- Internacionalización (ES, EN, CA)
- Autenticación segura con Supabase
- Almacenamiento en tiempo real

## Tech Stack

- **Frontend**: Quasar 2, Vue 3, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL + Auth)
- **Estado**: Pinia
- **Enrutamiento**: Vue Router 5
- **Internacionalización**: Vue I18n
- **Recurrencia**: RRule.js
- **Fechas**: date-fns

## Requisitos previos

- Node.js 22+
- npm, yarn o pnpm

## Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd task-calendar

# Instalar dependencias con pnpm (recomendado)
pnpm install

# o con npm/yarn
npm install
yarn install
```

## Variables de entorno

Crear archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyxxx...
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo (http://localhost:5173)
quasar dev

# Linting
pnpm lint

# Formateo automático
pnpm format

# Type checking
vue-tsc --noEmit
```

## Build para producción

```bash
# Build
quasar build
```

## Estructura del proyecto

```
src/
  boot/          Inicializaciones (i18n, Supabase)
  components/    Componentes reutilizables
  composables/   Lógica reutilizable (useCalendar)
  layouts/       Layouts principales (AuthLayout, MainLayout)
  pages/         Vistas enrutables
  router/        Configuración de Vue Router y guardias
  stores/        Pinia stores (auth, tasks)
  types/         Interfaces y tipos compartidos
  i18n/          Traducciones por idioma
  css/           Estilos globales
```

## Documentación

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura y flujos de datos
- [DATABASE.md](./DATABASE.md) - Esquema Supabase y queries
- [.agents.md](./.agents.md) - Agentes especializados de Copilot
- [.instructions.md](./.instructions.md) - Instrucciones personalizadas de Copilot

## Configuración de Supabase

### Setup inicial

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar SQL en `dev/sql/create_tables.sql`
3. Habilitar Row-Level Security (RLS) en tablas
4. Copiar credentials a `.env.local`

### Tablas principales

- `profiles` - Información de usuario
- `categories` - Categorías de tareas
- `tasks` - Tareas (con soporte de recurrencia RRule)
- `task_overrides` - Modificaciones a ocurrencias individuales
- `task_completions` - Registro de completamientos

Ver [DATABASE.md](./DATABASE.md) para detalles completos.

## Recurrencia de tareas

Las tareas pueden ser:

- **Puntuales**: se ejecutan una sola vez en `dtstart`
- **Recurrentes**: definidas con RRule (RFC 5545)

Ejemplo: Tarea diaria a las 9:00 AM

```typescript
{
  title: "Stand-up",
  dtstart: "2024-01-15T09:00:00",
  rrule: "FREQ=DAILY;UNTIL=2024-12-31",
  exdates: ["2024-01-16"]  // Excepciones
}
```

Las ocurrencias se calculan dinámicamente en el frontend usando `useCalendar()`.

## Scripts disponibles

| Comando        | Descripción                |
| -------------- | -------------------------- |
| `quasar dev`   | Servidor de desarrollo     |
| `quasar build` | Build para producción      |
| `pnpm lint`    | ESLint check               |
| `pnpm format`  | Prettier format            |
| `pnpm test`    | Ejecutar tests (pendiente) |

## Contribuir

Por favor, lee [CONTRIBUTING.md](./CONTRIBUTING.md) (si existe) para detalles sobre el proceso de contribución.

## Roadmap

- Tests unitarios e integración
- Notificaciones de recordatorios
- Exportación de datos
- Modo offline con sincronización
- Colaboración compartida de tareas

## Licencia

Ver [LICENSE](./LICENSE) para detalles.

## Contacto

Autor: Alvaro Olea (@opentrends)
Email: aolea@opentrends.net

---

Para más información sobre Quasar, consultar [documentación oficial](https://v2.quasar.dev).
