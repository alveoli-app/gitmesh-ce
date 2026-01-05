import Layout from '@/modules/layout/components/layout.vue';

// Lazy-loaded page components
const DevtelLayout = () => import('@/modules/devspace/pages/DevtelLayout.vue');
const TelemetryPage = () => import('@/modules/devspace/pages/TelemetryPage.vue');
const ReportListPage = () => import('@/modules/report/pages/report-list-page.vue');
const BoardPage = () => import('@/modules/devspace/pages/BoardPage.vue');
const BacklogPage = () => import('@/modules/devspace/pages/BacklogPage.vue');
const CyclesPage = () => import('@/modules/devspace/pages/CyclesPage.vue');
const ArchivedCyclesPage = () => import('@/modules/devspace/pages/ArchivedCyclesPage.vue');
const CapacityPage = () => import('@/modules/devspace/pages/CapacityPage.vue');
const SpecsPage = () => import('@/modules/devspace/pages/SpecsPage.vue');
const TeamPage = () => import('@/modules/devspace/pages/TeamPage.vue');
const SettingsPage = () => import('@/modules/devspace/pages/SettingsPage.vue');

export default [
    {
        path: '/devspace',
        component: Layout,
        meta: { auth: true },
        children: [
            {
                path: '',
                component: DevtelLayout,
                redirect: '/devspace/overview',
                children: [
                    {
                        name: 'devspace-overview',
                        path: 'overview',
                        component: TelemetryPage,
                        meta: { auth: true, title: 'Project Overview' },
                    },
                    {
                        name: 'devspace-devtel',
                        path: 'devtel',
                        component: ReportListPage,
                        meta: { auth: true, title: 'Devtel' },
                    },
                    {
                        name: 'devspace-board',
                        path: 'board',
                        component: BoardPage,
                        meta: { auth: true, title: 'Issues Board' },
                    },
                    {
                        name: 'devspace-backlog',
                        path: 'backlog',
                        component: BacklogPage,
                        meta: { auth: true, title: 'Backlog' },
                    },
                    {
                        name: 'devspace-cycles',
                        path: 'cycles',
                        component: CyclesPage,
                        meta: { auth: true, title: 'Cycles' },
                    },
                    {
                        name: 'devspace-archived-cycles',
                        path: 'cycles/archived',
                        component: ArchivedCyclesPage,
                        meta: { auth: true, title: 'Archived Cycles' },
                    },
                    {
                        name: 'devspace-capacity',
                        path: 'capacity',
                        component: CapacityPage,
                        meta: { auth: true, title: 'Capacity' },
                    },
                    {
                        name: 'devspace-specs',
                        path: 'specs',
                        component: SpecsPage,
                        meta: { auth: true, title: 'Specs' },
                    },
                    {
                        name: 'devspace-team',
                        path: 'team',
                        component: TeamPage,
                        meta: { auth: true, title: 'Team' },
                    },
                    {
                        name: 'devspace-project-settings',
                        path: 'project-settings',
                        component: SettingsPage,
                        meta: { auth: true, title: 'Project Settings' },
                    },
                ],
            },
        ],
    },
];
