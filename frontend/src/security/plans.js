/**
 * List of Plans
 */
class Plans {
  static get values() {
    return {
      pro: 'Pro',
      teamsPlus: 'Teams+',
      enterprise: 'Enterprise',
    };
  }

  static get communityValues() {
    return {
      community: 'Community',
      custom: 'Custom',
    };
  }
}

export default Plans;
