import { computed, type Ref } from 'vue';
import { RRule, RRuleSet } from 'rrule';
import { useTasksStore } from 'src/stores/tasks.store';
import type { TaskOccurrence } from 'src/types';

export function useCalendar(from: Ref<Date>, to: Ref<Date>) {
  const tasksStore = useTasksStore();

  const occurrences = computed<TaskOccurrence[]>(() => {
    const result: TaskOccurrence[] = [];

    for (const task of tasksStore.tasks) {
      if (!task.is_active) continue;

      let dates: Date[] = [];

      if (task.rrule) {
        // Tarea recurrente
        const ruleSet = new RRuleSet();
        const rule = RRule.fromString(
          `DTSTART:${task.dtstart.replace(/[-:]/g, '').split('.')[0]}Z\n${task.rrule}`,
        );
        ruleSet.rrule(rule);

        // Añadir excepciones
        for (const exdate of task.exdates ?? []) {
          ruleSet.exdate(new Date(exdate));
        }

        dates = ruleSet.between(from.value, to.value, true);
      } else {
        // Tarea puntual — solo aparece en su dtstart
        const start = new Date(task.dtstart);
        if (start >= from.value && start <= to.value) {
          dates = [start];
        }
      }

      for (const date of dates) {
        const override = tasksStore.getOverride(task.id, date);

        // Si el override marca la ocurrencia como eliminada, la saltamos
        if (override?.deleted) continue;

        const occurrence: TaskOccurrence = {
          task,
          date: override?.new_date ? new Date(override.new_date) : date,
          isCompleted: tasksStore.isCompleted(task.id, date),
          ...(override ? { override } : {}),
        };

        result.push(occurrence);
      }
    }

    // Ordenar por fecha
    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  return { occurrences };
}
