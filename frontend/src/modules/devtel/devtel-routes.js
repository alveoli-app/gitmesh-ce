import Layout from '@/modules/layout/components/layout.vue';

// Lazy-loaded page components
const DevtelLayout = () => import('@/modules/devtel/pages/DevtelLayout.vue');
const TelemetryPage = () => import('@/modules/devspace/pages/TelemetryPage.vue');

export default [
    {
        path: '/devspace/devtel',
        component: Layout,
        meta: { auth: true },
        children: [
            {
                path: '',
                name: 'devtel',
                component: DevtelLayout,
                meta: { auth: true, title: 'Developer Telemetry' },
                children: [
                    {
                        path: '',
                        component: TelemetryPage,
                        meta: { auth: true, title: 'Devtel' },
                    },
                ],
            },
        ],
    },
];
