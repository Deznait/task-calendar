export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  rrule: string | null;
  dtstart: string;
  exdates: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // relaciones opcionales (joins)
  category?: Category;
}

export interface TaskOverride {
  id: string;
  task_id: string;
  user_id: string;
  original_date: string;
  new_date: string | null;
  title: string | null;
  description: string | null;
  deleted: boolean;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  completed_date: string;
  notes: string | null;
  mood: number | null;
  created_at: string;
}

// Ocurrencia calculada por rrule (no existe en BD, se genera en frontend)
export interface TaskOccurrence {
  task: Task;
  date: Date;
  isCompleted: boolean;
  override?: TaskOverride;
}
