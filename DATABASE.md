# Task Calendar - Base de datos

Documentación del esquema Supabase (PostgreSQL).

## Overview

5 tablas principales con **Row-Level Security (RLS)** activo. Todos los datos están vinculados a un usuario mediante `user_id`.

## Tablas

### 1. `profiles`

Información del usuario (sincronizada con `auth.users`).

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Columnas:**
| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | ID del usuario (auth.users) | PK, FK |
| `email` | TEXT | Email | |
| `display_name` | TEXT NULL | Nombre mostrado | Opcional |
| `avatar_url` | TEXT NULL | URL avatar | Opcional |
| `created_at` | TIMESTAMPTZ | Creación | Default now() |
| `updated_at` | TIMESTAMPTZ | Última actualización | Default now() |

**RLS:**

- SELECT: Usuario ve solo su profile
- INSERT: Solo en signup (trigger)
- UPDATE: Usuario actualiza solo su profile
- DELETE: No permitido

---

### 2. `categories`

Categorías de tareas (colores, iconos).

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'circle',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columnas:**
| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | ID único | PK |
| `user_id` | UUID | Propietario | FK (CASCADE) |
| `name` | TEXT | Nombre (ej: "Trabajo", "Personal") | NOT NULL |
| `color` | TEXT | Hex color (ej: "#6366f1") | Default '#6366f1' |
| `icon` | TEXT | Quasar icon (ej: "star") | Default 'circle' |
| `created_at` | TIMESTAMPTZ | Creación | Default now() |

**Índices:**

- `user_id` → Búsqueda rápida por usuario

**RLS:**

- SELECT: Usuario ve solo sus categorías
- INSERT/UPDATE: Usuario gestiona sus categorías

---

### 3. `tasks`

Tareas principales con soporte de recurrencia.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  rrule TEXT,                    -- RFC 5545
  dtstart TIMESTAMPTZ NOT NULL,  -- Fecha/hora inicio
  exdates DATE[] DEFAULT '{}',   -- Excepciones
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Columnas:**
| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | ID único | PK |
| `user_id` | UUID | Propietario | FK (CASCADE) |
| `category_id` | UUID NULL | Categoría | FK (SET NULL) |
| `title` | TEXT | Título tarea | NOT NULL |
| `description` | TEXT NULL | Descripción | Opcional |
| `rrule` | TEXT NULL | RFC 5545 recurrencia | Opcional |
| `dtstart` | TIMESTAMPTZ | Fecha/hora inicio | NOT NULL |
| `exdates` | DATE[] | Fechas excluidas | Default '{}' |
| `is_active` | BOOLEAN | Soft-delete | Default true |
| `created_at` | TIMESTAMPTZ | Creación | Default now() |
| `updated_at` | TIMESTAMPTZ | Última actualización | Default now() |

**Índices:**

- `user_id` → Filtrar por usuario
- `is_active` → Soft-delete queries

**RLS:**

- SELECT: Usuario ve solo sus tareas activas
- INSERT/UPDATE/DELETE: Usuario gestiona sus tareas

**Ejemplos:**

Tarea puntual (sin recurrencia):

```json
{
  "title": "Cita dentista",
  "dtstart": "2024-02-15T14:00:00",
  "rrule": null,
  "exdates": []
}
```

Tarea recurrente (diaria):

```json
{
  "title": "Meditation",
  "dtstart": "2024-01-01T08:00:00",
  "rrule": "FREQ=DAILY;UNTIL=20241231",
  "exdates": ["2024-01-16", "2024-02-20"]
}
```

Tarea recurrente (semanal):

```json
{
  "title": "Team standup",
  "dtstart": "2024-01-08T09:00:00",
  "rrule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20241231",
  "exdates": ["2024-01-22"] // Feriado
}
```

---

### 4. `task_overrides`

Modificaciones a ocurrencias específicas de tareas recurrentes.

```sql
CREATE TABLE task_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  new_date DATE,
  title TEXT,
  description TEXT,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columnas:**
| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | ID único | PK |
| `task_id` | UUID | Tarea | FK (CASCADE) |
| `user_id` | UUID | Propietario | FK (CASCADE) |
| `original_date` | DATE | Fecha original de ocurrencia | NOT NULL |
| `new_date` | DATE NULL | Nueva fecha (null = sin mover) | Opcional |
| `title` | TEXT NULL | Título modificado | Opcional |
| `description` | TEXT NULL | Descripción modificada | Opcional |
| `deleted` | BOOLEAN | Si true, oculta la ocurrencia | Default false |
| `created_at` | TIMESTAMPTZ | Creación | Default now() |

**Casos de uso:**

Mover ocurrencia:

```json
{
  "task_id": "abc-123",
  "original_date": "2024-02-15",
  "new_date": "2024-02-16",
  "deleted": false
}
```

Editar título en ocurrencia:

```json
{
  "task_id": "abc-123",
  "original_date": "2024-02-15",
  "new_date": null,
  "title": "Team standup (especial)",
  "deleted": false
}
```

Eliminar ocurrencia:

```json
{
  "task_id": "abc-123",
  "original_date": "2024-02-15",
  "new_date": null,
  "deleted": true
}
```

---

### 5. `task_completions`

Registro de tareas completadas.

```sql
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  notes TEXT,
  mood INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Columnas:**
| Columna | Tipo | Descripción | Restricciones |
|---------|------|-------------|---------------|
| `id` | UUID | ID único | PK |
| `task_id` | UUID | Tarea completada | FK (CASCADE) |
| `user_id` | UUID | Usuario | FK (CASCADE) |
| `completed_date` | DATE | Fecha de completamiento | NOT NULL |
| `notes` | TEXT NULL | Notas/comentarios | Opcional |
| `mood` | INT NULL | Estado ánimo (1-10) | Opcional |
| `created_at` | TIMESTAMPTZ | Creación | Default now() |

**Índices:**

- `(user_id, completed_date)` → Queries por usuario y rango
- `(task_id, completed_date)` → Verificar si completada

**RLS:**

- SELECT/INSERT: Usuario ve/registra sus completamientos

---

## Relaciones (ER Diagram)

```
profiles (1) ─────── (N) categories
    │
    ├─────── (N) tasks
    │           │
    │           └─── (N) task_overrides
    │
    ├─────── (N) task_completions
    │
    └─────── (N) task_overrides

categories (1) ─────── (0..1) tasks
```

---

## Row-Level Security (RLS)

**Principio:** Cada usuario solo ve/modifica SUS datos.

Todas las tablas tienen políticas:

```sql
-- Ejemplo: SELECT en tasks
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- Ejemplo: INSERT en tasks
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Beneficio:** La BD garantiza seguridad, no solo el código.

---

## Queries frecuentes (desde el frontend)

### Obtener tareas activas con categoría

```javascript
supabase
  .from('tasks')
  .select('*, category:categories(*)')
  .eq('user_id', userId)
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

### Obtener completamientos en rango

```javascript
supabase
  .from('task_completions')
  .select('*')
  .eq('user_id', userId)
  .gte('completed_date', '2024-02-01')
  .lte('completed_date', '2024-02-29');
```

### Obtener overrides de un mes

```javascript
supabase
  .from('task_overrides')
  .select('*')
  .eq('user_id', userId)
  .gte('original_date', '2024-02-01')
  .lte('original_date', '2024-02-29');
```

### Marcar tarea como completada

```javascript
supabase.from('task_completions').insert({
  task_id: taskId,
  user_id: userId,
  completed_date: dateStr,
  notes: null,
  mood: null,
});
```

### Eliminar completamiento (desmarcar)

```javascript
supabase.from('task_completions').delete().eq('task_id', taskId).eq('completed_date', dateStr);
```

---

## Migraciones/Setup

Script SQL inicial: `dev/sql/create_tables.sql`

Pasos:

1. Habilitar uuid extension
2. Crear tablas en orden (respetar FKs)
3. Habilitar RLS en cada tabla
4. Crear políticas de RLS
5. Crear índices para performance

---

## Performance

**Índices recomendados:**

- `tasks(user_id, is_active)` → Filtros comunes
- `task_completions(user_id, completed_date)` → Rango mensual
- `task_overrides(user_id, original_date)` → Rango mensual
- `categories(user_id)` → Filtro por usuario

**Límites:**

- Cada usuario puede tener ~10k tareas
- Cada tarea puede tener ~100k completamientos
- Las ocurrencias se calculan bajo demanda (no almacenadas)

---

## Backups

Supabase automáticamente:

- ✅ Hace backups diarios
- ✅ Retiene 7 días de history
- ✅ Permite PITR (Point-In-Time Recovery)

Acceder: Dashboard Supabase → Backups
