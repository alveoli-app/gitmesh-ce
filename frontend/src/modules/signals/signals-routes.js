import Layout from '@/modules/layout/components/layout.vue';
import Permissions from '@/security/permissions';

// Import existing page components from the main codebase
const DashboardPage = () => import('@/modules/dashboard/pages/dashboard-page.vue');
const MemberListPage = () => import('@/modules/member/pages/member-list-page.vue');
const OrganizationListPage = () => import('@/modules/organization/pages/organization-list-page.vue');
const ActivityListPage = () => import('@/modules/activity/pages/activity-list-page.vue');
const AutomationsPage = () => import('@/modules/automation/pages/automation-page.vue');
const IntegrationListPage = () => import('@/modules/integration/components/integration-list-page.vue');

// Paywall page for premium features in community edition
const PaywallPage = () => import('@/modules/layout/pages/paywall-page.vue');

// Signals tab sub-page components - using existing components
const SignalsHomePage = DashboardPage; // Use existing dashboard as home
const SignalsContactsPage = MemberListPage; // Use existing member list
const SignalsOrganizationsPage = OrganizationListPage; // Use existing organization list
const SignalsActivitiesPage = ActivityListPage; // Use existing activity list
const SignalsAutomationsPage = AutomationsPage; // Use existing automations page
const SignalsIntegrationsPage = IntegrationListPage; // Use existing integrations page

export default [
  // Main signals tab structure with sub-pages following DevSpace pattern
  // Available in Community Edition
  {
    path: '/signals',
    component: Layout,
    meta: {
      auth: true,
      title: 'Signals',
    },
    redirect: '/signals/dashboard', // Default to dashboard page
    children: [
      {
        name: 'signals-dashboard',
        path: 'dashboard',
        component: SignalsHomePage,
        meta: {
          auth: true,
          title: 'Signals - Dashboard',
        },
      },
      {
        name: 'signals-contacts',
        path: 'contacts',
        component: SignalsContactsPage,
        meta: {
          auth: true,
          permission: Permissions.values.memberRead,
          title: 'Signals - Contacts',
        },
      },
      {
        name: 'signals-organizations',
        path: 'organizations',
        component: SignalsOrganizationsPage,
        meta: {
          auth: true,
          permission: Permissions.values.organizationRead,
          title: 'Signals - Organizations',
        },
      },
      {
        name: 'signals-activities',
        path: 'activities',
        component: SignalsActivitiesPage,
        meta: {
          auth: true,
          permission: Permissions.values.activityRead,
          title: 'Signals - Activities',
        },
      },
      {
        name: 'signals-automations',
        path: 'automations',
        component: SignalsAutomationsPage,
        meta: {
          auth: true,
          permission: Permissions.values.automationEdit,
          title: 'Signals - Automations',
        },
      },
      {
        name: 'signals-integrations',
        path: 'integrations',
        component: SignalsIntegrationsPage,
        meta: {
          auth: true,
          permission: Permissions.values.integrationRead,
          title: 'Signals - Integrations',
        },
      },
      // Sentinel route fallback for community edition
      // In community edition, redirect to paywall
      // In enterprise edition, this route is overridden by premium-frontend
      {
        name: 'signals-sentinel-fallback',
        path: 'sentinel',
        redirect: '/paywall/sentinel',
        meta: {
          auth: true,
          title: 'Signals - Sentinel',
        },
      },
    ],
  },
  // Paywall route for premium features in community edition
  {
    name: 'paywall',
    path: '/paywall/:section?',
    component: PaywallPage,
    meta: {
      auth: true,
      title: 'Upgrade Required',
    },
  },
];