import Plans from '@/security/plans';

export const planLimits = {
  enrichment: {
    [Plans.values.pro]: 1000,
    [Plans.values.teamsPlus]: 'unlimited',
    [Plans.values.enterprise]: 'unlimited',
  },
  export: {
    [Plans.values.pro]: 10,
    [Plans.values.teamsPlus]: 20,
    [Plans.values.enterprise]: 'unlimited',
  },
  automation: {
    [Plans.values.pro]: 10,
    [Plans.values.teamsPlus]: 20,
    [Plans.values.enterprise]: 'unlimited',
  },
};
