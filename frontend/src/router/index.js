import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guest: true } },
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
      {
        path: 'projects',
        name: 'projects',
        component: () => import('../views/ProjectsView.vue'),
        meta: { staffOnly: true },
      },
      {
        path: 'projects/:id',
        name: 'project-detail',
        component: () => import('../views/ProjectDetailView.vue'),
        meta: { staffOnly: true },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('../views/TasksView.vue'),
        meta: { staffOnly: true },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/UsersView.vue'),
        meta: { roles: ['admin', 'head'] },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../views/ProfileView.vue'),
        meta: { staffOnly: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login';
  if (to.meta.guest && auth.isAuthenticated) {
    return auth.mustChangePassword && !auth.isAdmin ? '/profile' : '/dashboard';
  }
  if (auth.isAuthenticated && auth.mustChangePassword && !auth.isAdmin && to.path !== '/profile') {
    return '/profile';
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) return '/dashboard';
  if (to.meta.staffOnly && auth.isAdmin) return '/dashboard';
  if (auth.isAdmin && !['/dashboard', '/users'].includes(to.path)) return '/dashboard';
});

export default router;
