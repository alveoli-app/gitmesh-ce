export default {
  enabled: true,
  name: 'MEDIUM',
  backgroundColor: '#FFFFFF',
  borderColor: '#FFFFFF',
  description: 'Connect Medium to surface posts and profile information.',
  onboard: {
    description: 'Sync posts and profile information from Medium.',
  },
  image: '/images/integrations/custom.svg',
  url: ({ username }) => (username ? `https://medium.com/@${username}` : null),
  chartColor: '#000000',
  showProfileLink: true,
  activityDisplay: {
    showLinkToUrl: true,
  },
};
