import { Garden, MaintenanceTask } from '@/models';

export const scheduleNotificationsForGarden = (garden: Garden): void => {
  // TODO: Use @notifee/react-native or react-native-push-notification to schedule
  // local notifications for each upcoming maintenance task.
  // Call notifee.createTriggerNotification() with a TimestampTrigger for each task's dueDate.
  void garden;
};

export const getOverdueTasks = (garden: Garden): MaintenanceTask[] => {
  const now = new Date().toISOString();
  return garden.plants.flatMap((plant) =>
    plant.maintenanceTasks.filter((task) => !task.completedDate && task.dueDate < now),
  );
};

export const getUpcomingTasks = (garden: Garden, withinDays: number): MaintenanceTask[] => {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + withinDays);
  const nowStr = now.toISOString();
  const cutoffStr = cutoff.toISOString();

  return garden.plants.flatMap((plant) =>
    plant.maintenanceTasks.filter(
      (task) => !task.completedDate && task.dueDate >= nowStr && task.dueDate <= cutoffStr,
    ),
  );
};
