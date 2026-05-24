import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from 'src/boot/supabase';
import { useAuthStore } from './auth.store';
import type { Task, TaskCompletion, TaskOverride } from 'src/types';

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([]);
  const completions = ref<TaskCompletion[]>([]);
  const overrides = ref<TaskOverride[]>([]);
  const loading = ref(false);

  async function fetchTasks() {
    const authStore = useAuthStore();
    if (!authStore.user) return;

    loading.value = true;
    const { data, error } = await supabase
      .from('tasks')
      .select('*, category:categories(*)')
      .eq('user_id', authStore.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else tasks.value = data ?? [];
    loading.value = false;
  }

  async function fetchCompletions(from: Date, to: Date) {
    const authStore = useAuthStore();
    if (!authStore.user) return;

    const { data, error } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', authStore.user.id)
      .gte('completed_date', from.toISOString().split('T')[0])
      .lte('completed_date', to.toISOString().split('T')[0]);

    if (error) console.error(error);
    else completions.value = data ?? [];
  }

  async function fetchOverrides(from: Date, to: Date) {
    const authStore = useAuthStore();
    if (!authStore.user) return;

    const { data, error } = await supabase
      .from('task_overrides')
      .select('*')
      .eq('user_id', authStore.user.id)
      .gte('original_date', from.toISOString().split('T')[0])
      .lte('original_date', to.toISOString().split('T')[0]);

    if (error) console.error(error);
    else overrides.value = data ?? [];
  }

  async function createTask(payload: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const authStore = useAuthStore();
    if (!authStore.user) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...payload, user_id: authStore.user.id })
      .select()
      .single();

    if (error) throw error;
    tasks.value.unshift(data);
    return data;
  }

  async function updateTask(id: string, payload: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const index = tasks.value.findIndex((t) => t.id === id);
    if (index !== -1) tasks.value[index] = data;
    return data;
  }

  async function deleteTask(id: string) {
    // Soft delete — marcamos como inactiva
    await updateTask(id, { is_active: false });
    tasks.value = tasks.value.filter((t) => t.id !== id);
  }

  async function toggleCompletion(taskId: string, date: Date) {
    const authStore = useAuthStore();
    if (!authStore.user) return;

    const dateStr = date.toISOString().split('T')[0];
    const existing = completions.value.find(
      (c) => c.task_id === taskId && c.completed_date === dateStr,
    );

    if (existing) {
      // Desmarcar
      const { error } = await supabase.from('task_completions').delete().eq('id', existing.id);

      if (error) throw error;
      completions.value = completions.value.filter((c) => c.id !== existing.id);
    } else {
      // Marcar como completada
      const { data, error } = await supabase
        .from('task_completions')
        .insert({
          task_id: taskId,
          user_id: authStore.user.id,
          completed_date: dateStr,
        })
        .select()
        .single();

      if (error) throw error;
      completions.value.push(data);
    }
  }

  async function addOverride(override: Omit<TaskOverride, 'id' | 'user_id' | 'created_at'>) {
    const authStore = useAuthStore();
    if (!authStore.user) return;

    const { data, error } = await supabase
      .from('task_overrides')
      .insert({ ...override, user_id: authStore.user.id })
      .select()
      .single();

    if (error) throw error;
    overrides.value.push(data);
    return data;
  }

  function isCompleted(taskId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    return completions.value.some((c) => c.task_id === taskId && c.completed_date === dateStr);
  }

  function getOverride(taskId: string, date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    return overrides.value.find((o) => o.task_id === taskId && o.original_date === dateStr);
  }

  return {
    tasks,
    completions,
    overrides,
    loading,
    fetchTasks,
    fetchCompletions,
    fetchOverrides,
    createTask,
    updateTask,
    deleteTask,
    toggleCompletion,
    addOverride,
    isCompleted,
    getOverride,
  };
});
