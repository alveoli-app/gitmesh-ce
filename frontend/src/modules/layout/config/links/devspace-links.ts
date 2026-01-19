import { MenuLink } from '@/modules/layout/types/MenuLink';

export const overview: MenuLink = {
    id: 'overview',
    label: 'Overview',
    icon: 'ri-dashboard-line',
    routeName: 'devspace-overview',
    path: '/devspace/overview',
    display: () => true,
    disable: () => false,
};

export const board: MenuLink = {
    id: 'board',
    label: 'Issues Board',
    icon: 'ri-layout-grid-line',
    routeName: 'devspace-board',
    path: '/devspace/board',
    display: () => true,
    disable: () => false,
};


export const backlog: MenuLink = {
    id: 'backlog',
    label: 'Backlog',
    icon: 'ri-list-check-2',
    routeName: 'devspace-backlog',
    path: '/devspace/backlog',
    display: () => true,
    disable: () => false,
};

export const cycles: MenuLink = {
    id: 'cycles',
    label: 'Cycles',
    icon: 'ri-refresh-line',
    routeName: 'devspace-cycles',
    path: '/devspace/cycles',
    display: () => true,
    disable: () => false,
};

export const capacity: MenuLink = {
    id: 'capacity',
    label: 'Capacity',
    icon: 'ri-group-line',
    routeName: 'devspace-capacity',
    path: '/devspace/capacity',
    display: () => true,
    disable: () => false,
};

export const specs: MenuLink = {
    id: 'specs',
    label: 'Specs',
    icon: 'ri-file-text-line',
    routeName: 'devspace-specs',
    path: '/devspace/specs',
    display: () => true,
    disable: () => false,
};

export const team: MenuLink = {
    id: 'team',
    label: 'Team',
    icon: 'ri-team-line',
    routeName: 'devspace-team',
    path: '/devspace/team',
    display: () => true,
    disable: () => false,
};

export const devtel: MenuLink = {
    id: 'devtel',
    label: 'Devtel',
    icon: 'ri-bar-chart-line',
    routeName: 'devspace-devtel',
    path: '/devspace/devtel',
    display: () => true,
    disable: () => false,
};

export const projectSettings: MenuLink = {
    id: 'settings',
    label: 'Settings',
    icon: 'ri-settings-3-line',
    routeName: 'devspace-project-settings',
    path: '/devspace/project-settings',
    display: () => true,
    disable: () => false,
};
