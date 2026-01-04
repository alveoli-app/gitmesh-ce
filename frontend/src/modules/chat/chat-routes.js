import Layout from '@/modules/layout/components/layout.vue';

// Lazy load components
const ChatLayout = () => import('@/modules/chat/pages/ChatLayout.vue');
const ConversationPage = () => import('@/modules/chat/pages/ConversationPage.vue');
const AgentsPage = () => import('@/modules/chat/pages/AgentsPage.vue');
const ActionsPage = () => import('@/modules/chat/pages/ActionsPage.vue');
const InsightsPage = () => import('@/modules/chat/pages/InsightsPage.vue');

export default [
  {
    path: '/chat',
    component: Layout,
    meta: { auth: true, title: 'AI Chat' },
    children: [
      {
        path: '',
        component: ChatLayout,
        meta: { auth: true, badge: 'BETA' },
        children: [
          {
            name: 'chat-default',
            path: '',
            redirect: '/chat/conversations',
          },
          {
            name: 'chat-conversations',
            path: 'conversations',
            component: ConversationPage,
            meta: { title: 'Conversations', auth: true },
          },
          {
            name: 'chat-conversation',
            path: 'conversations/:conversationId',
            component: ConversationPage,
            meta: { title: 'Chat', auth: true },
          },
          {
            name: 'chat-agents',
            path: 'agents',
            component: AgentsPage,
            meta: { title: 'AI Agents', auth: true },
          },
          {
            name: 'chat-actions',
            path: 'actions',
            component: ActionsPage,
            meta: { title: 'Action History', auth: true },
          },
          {
            name: 'chat-insights',
            path: 'insights',
            component: InsightsPage,
            meta: { title: 'AI Insights', auth: true },
          },
        ],
      },
    ],
  },
];
