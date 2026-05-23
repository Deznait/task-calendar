import type { RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from 'src/stores/auth.store';

const PUBLIC_ROUTES = ['/auth'];

export async function authGuard(to: RouteLocationNormalized) {
  const authStore = useAuthStore();

  if (!authStore.initialized) {
    await authStore.init();
  }

  const isPublic = PUBLIC_ROUTES.includes(to.path);
  const isAuthenticated = authStore.isAuthenticated;

  if (!isAuthenticated && !isPublic) return '/auth';
  if (isAuthenticated && isPublic) return '/';
  return true;
}
