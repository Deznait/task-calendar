# Task Calendar - Arquitectura

Descripción de la arquitectura, flujos de datos y componentes principales.

## Overview

Task Calendar es una aplicación web de gestión de tareas con soporte para **recurrencia flexible** (RRule), **completamientos** y **modificaciones puntuales**. La arquitectura sigue un patrón cliente-servidor con Supabase como backend.

```
┌─────────────────────────────────────────┐
│   Frontend (Quasar + Vue 3 + TS)       │
│  ┌──────────────────────────────────┐  │
│  │   Pages & Components             │  │
│  ├──────────────────────────────────┤  │
│  │   Stores (Pinia)                │  │
│  │  - tasks.store                  │  │
│  │  - auth.store                   │  │
│  ├──────────────────────────────────┤  │
│  │   Composables                   │  │
│  │  - useCalendar                  │  │
│  └──────────────────────────────────┘  │
└────────────┬────────────────────────────┘
             │ HTTP/WebSockets
             ↓
┌─────────────────────────────────────────┐
│   Supabase (PostgreSQL + Auth)         │
│  ┌──────────────────────────────────┐  │
│  │  Tablas:                         │  │
│  │  - profiles                      │  │
│  │  - categories                    │  │
│  │  - tasks                         │  │
│  │  - task_overrides                │  │
│  │  - task_completions              │  │
│  ├──────────────────────────────────┤  │
│  │  Row-Level Security (RLS)        │  │
│  │  - Acceso por user_id            │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Flujo de datos principal

### 1. Autenticación (AuthStore)

```
Usuario input → Supabase Auth → JWT token → Profiles table
```

- Store: `src/stores/auth.store.ts`
- Boot: `src/boot/supabase.ts`
- Guardias: `src/router/guards.ts`

### 2. Carga de tareas (TasksStore)

```
fetchTasks() → Supabase queries + JOIN categories
                ↓
           tasks.value = [...]
           (reactividad automática)
```

### 3. Cálculo de ocurrencias (useCalendar)

```
Rango fechas [from, to] → RRuleSet.between()
                          ↓
                   Ocurrencias calculadas
                          ↓
                   [TaskOccurrence[], sorted]
```

### 4. Completamientos

```
User marks task done → toggleCompletion(taskId, date)
                       ↓
            INSERT task_completions
                       ↓
            isCompleted check en renderizado
```

### 5. Overrides (cambios puntuales)

```
Mover/editar ocurrencia → INSERT/UPDATE task_overrides
                          ↓
                   Datos persistidos
                          ↓
                   Re-render automático
```

## Componentes principales

### Pages

- **IndexPage.vue**: Vista principal con calendario
- **AuthPage.vue**: Login/signup
- **ErrorNotFound.vue**: 404

### Layouts

- **MainLayout.vue**: Layout con sidebar/header (vistas autenticadas)
- **AuthLayout.vue**: Layout limpio (login/signup)

### Stores (Pinia)

#### tasks.store.ts

```typescript
// Estados
const tasks: Task[]; // Lista de tareas activas
const completions: TaskCompletion[]; // Completamientos del usuario
const overrides: TaskOverride[]; // Modificaciones puntuales

// Acciones principales
fetchTasks(); // Cargar tareas
fetchCompletions(from, to); // Completamientos en rango
fetchOverrides(from, to); // Overrides en rango
createTask(payload); // Nueva tarea
updateTask(id, payload); // Editar tarea
deleteTask(id); // Soft-delete (is_active: false)
toggleCompletion(taskId, date); // Marcar/desmarcar completada
createOverride(payload); // Crear override
```

#### auth.store.ts

```typescript
// Estados
const user: AuthUser | null; // Usuario actual
const loading: boolean;

// Acciones
signUp(email, password); // Registro
signIn(email, password); // Login
signOut(); // Logout
fetchUser(); // Obtener usuario actual
```

### Composables

#### useCalendar(from: Ref<Date>, to: Ref<Date>)

Calcula ocurrencias de tareas en un rango de fechas.

```typescript
const { occurrences } = useCalendar(fromDate, toDate);
// occurrences es un computed que se actualiza cuando:
// - Cambian from/to
// - Cambian tasks en el store
// - Cambian completions en el store
// - Cambian overrides en el store
```

**Lógica interna:**

1. Para cada tarea activa
2. Si tiene `rrule`: generar ocurrencias con RRuleSet
3. Si no: solo el `dtstart`
4. Filtrar excepciones (`exdates`)
5. Filtrar overrides eliminadas (`deleted: true`)
6. Buscar completamientos y overrides
7. Ordenar por fecha

## Tipos de datos

### Core types (`src/types/index.ts`)

```typescript
Profile
  id: UUID
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: ISO 8601
  updated_at: ISO 8601

Category
  id: UUID
  user_id: UUID
  name: string
  color: string (hex)
  icon: string (Quasar icon)
  created_at: ISO 8601

Task (la más compleja)
  id: UUID
  user_id: UUID
  category_id: UUID | null
  title: string
  description: string | null
  rrule: RFC 5545 string | null  ← CLAVE para recurrencia
  dtstart: ISO 8601             ← Fecha/hora inicio
  exdates: string[]             ← Excepciones
  is_active: boolean
  created_at: ISO 8601
  updated_at: ISO 8601
  category?: Category            ← JOIN opcional

TaskOverride (para cambios puntuales)
  id: UUID
  task_id: UUID
  user_id: UUID
  original_date: YYYY-MM-DD
  new_date: YYYY-MM-DD | null   ← null = sin cambio de fecha
  title: string | null           ← Título modificado
  description: string | null     ← Descripción modificada
  deleted: boolean               ← Si true, oculta la ocurrencia
  created_at: ISO 8601

TaskCompletion
  id: UUID
  task_id: UUID
  user_id: UUID
  completed_date: YYYY-MM-DD     ← Fecha de completamiento
  notes: string | null
  mood: number | null            ← 1-10
  created_at: ISO 8601

TaskOccurrence (generada en frontend, no en BD)
  task: Task
  date: Date
  isCompleted: boolean
  override?: TaskOverride        ← Si tiene override
```

## Recurrencia (RRule)

El proyecto usa **rrule.js** (RFC 5545) para manejar tareas recurrentes.

### Ejemplo: Tarea diaria a las 9:00 AM

```typescript
const task: Task = {
  title: 'Stand-up',
  dtstart: '2024-01-15T09:00:00',
  rrule: 'FREQ=DAILY;UNTIL=2024-12-31',
  exdates: ['2024-01-16', '2024-02-20'], // Días que no ocurre
  // ...
};
```

### Conversión a ocurrencias

```typescript
// Entrada
DTSTART:20240115T090000Z
FREQ=DAILY;UNTIL=20241231
EXDATE:20240116,20240220

// Salida (en rango Ene-Feb)
[
  2024-01-15T09:00:00,
  2024-01-17T09:00:00,
  2024-01-18T09:00:00,
  // ...
]
```

## Flujo de autenticación

```
Usuario no autenticado
         ↓
    AuthPage.vue
         ↓
    signUp() / signIn() en auth.store
         ↓
    Supabase.auth.signUp/signIn
         ↓
    ✓ Éxito → Guardia redirige a IndexPage
    ✗ Error → Mostrar mensaje
```

Guardias:

- `requireAuth` → Redirige a AuthPage si no autenticado
- `requireNoAuth` → Redirige a IndexPage si autenticado

## Internacionalización (i18n)

Soporta: **Español (es)**, **English (en)**, **Català (ca)**

```typescript
// Uso en templates
<div>{{ $t('calendar.title') }}</div>

// Definición en src/i18n/locales/es.ts
export default {
  calendar: {
    title: "Calendario"
  }
}
```

## Seguridad (RLS en Supabase)

Todas las tablas tienen Row-Level Security activado:

```sql
-- Las queries solo ven filas del usuario actual
WHERE user_id = auth.uid()
```

## CSS y Styling

- **Framework**: Quasar components
- **Preprocesador**: SCSS
- **Variables**: `src/css/quasar.variables.scss`
- **Global**: `src/css/app.scss`
- **Componentes**: `<style scoped>`

## Desarrollo y Build

```bash
# Development server
quasar dev        → http://localhost:5173

# Build para producción
quasar build      → ./dist/

# Linting
pnpm lint

# Formateo
pnpm format
```

## Deployment

- **Frontend**: Hosting estático (Vercel, Netlify, etc.)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Variables de entorno**: `.env.local` (nunca commitear)

Requisitos:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyxxx...
```
