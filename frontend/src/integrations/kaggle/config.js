export default {
  enabled: true,
  name: 'KAGGLE',
  backgroundColor: '#FFFFFF',
  borderColor: '#FFFFFF',
  description: 'Connect Kaggle to surface profiles and datasets.',
  onboard: {
    description: 'Sync profile information and public activity from Kaggle.',
  },
  image: '/images/integrations/kaggle.png',
  url: ({ username }) => (username ? `https://www.kaggle.com/${username}` : null),
  chartColor: '#20B2AA',
  showProfileLink: true,
  activityDisplay: {
    showLinkToUrl: true,
  },
};
