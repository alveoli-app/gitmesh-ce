export default {
  enabled: true,
  name: 'HASHNODE',
  backgroundColor: '#FFFFFF',
  borderColor: '#FFFFFF',
  description: 'Connect Hashnode to surface articles and profile information.',
  onboard: {
    description: 'Sync articles and profile information from Hashnode.',
  },
  image: '/images/integrations/custom.svg',
  url: ({ username }) => (username ? `https://hashnode.com/@${username}` : null),
  chartColor: '#111827',
  showProfileLink: true,
  activityDisplay: {
    showLinkToUrl: true,
  },
};
