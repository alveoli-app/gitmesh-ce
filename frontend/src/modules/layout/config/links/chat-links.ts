import { MenuLink } from '@/modules/layout/types/MenuLink';

export const conversations: MenuLink = {
  id: 'conversations',
  label: 'Conversations',
  icon: 'ri-chat-3-line',
  routeName: 'chat-conversations',
  path: '/chat/conversations',
  display: () => true,
  disable: () => false,
};

export const agents: MenuLink = {
  id: 'agents',
  label: 'Agents',
  icon: 'ri-robot-line',
  routeName: 'chat-agents',
  path: '/chat/agents',
  display: () => true,
  disable: () => false,
};

export const actions: MenuLink = {
  id: 'actions',
  label: 'Actions',
  icon: 'ri-flashlight-line',
  routeName: 'chat-actions',
  path: '/chat/actions',
  display: () => true,
  disable: () => false,
};

export const insights: MenuLink = {
  id: 'insights',
  label: 'Insights',
  icon: 'ri-lightbulb-line',
  routeName: 'chat-insights',
  path: '/chat/insights',
  display: () => true,
  disable: () => false,
};
