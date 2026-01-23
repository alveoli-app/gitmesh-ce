export default {
  enabled: true,
  name: 'PRODUCT HUNT',
  backgroundColor: '#FFFFFF',
  borderColor: '#FFFFFF',
  description: 'Connect Product Hunt to surface launches and profiles.',
  onboard: {
    description: 'Sync Product Hunt profiles and posts.',
  },
  image: '/images/integrations/producthunt.png',
  url: ({ username }) => (username ? `https://www.producthunt.com/@${username}` : null),
  chartColor: '#DA552F',
  showProfileLink: true,
  activityDisplay: {
    showLinkToUrl: true,
  },
};
