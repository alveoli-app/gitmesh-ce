import Layout from '@/modules/layout/components/layout.vue';

const DashboardPage = () => import('@/modules/dashboard/pages/dashboard-page.vue');

export default [
  {
    path: '/dashboard',
    redirect: '/signals/dashboard', // Redirect to signals dashboard following tab_name/page_name rule
  },
];
