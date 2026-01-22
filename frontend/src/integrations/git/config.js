// import config from '@/config';
import GitConnect from './components/git-connect.vue';

export default {
  // TODO: Git integration is temporarily disabled from the UI
  // Will be re-enabled in the future to support syncing with different Git platforms
  // (GitLab, Bitbucket, self-hosted Git servers, etc.)
  enabled: false, // config.isGitEnabled,
  hideAsIntegration: true, // !config.isGitEnabled,
  name: 'Git',
  backgroundColor: '#FFFFFF',
  borderColor: '#FFFFFF',
  description:
    'Connect Git to sync commit activities from your repos.',
  onboard: {
    description: 'Sync commit activities from your repos.',
  },
  image:
    '/images/integrations/git.png',
  connectComponent: GitConnect,
  url: () => null,
  showProfileLink: false,
  chartColor: '#E5512C',
  activityDisplay: {
    showContentDetails: true,
    showLinkToUrl: false,
    showSourceId: true,
    typeIcon: 'commit',
  },
  conversationDisplay: {
    showConversationAttributes: true,
    replyContent: () => null,
    attributes: (attributes) => ({
      changes: attributes.lines,
      changesCopy: 'line',
      insertions: attributes.insertions,
      deletions: attributes.deletions,
    }),
  },
  organization: {
    handle: (identity) => (identity.url ? identity.url.split('/').at(-1) : identity.name),
  },
};
