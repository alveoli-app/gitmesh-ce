import Plans from '@/security/plans';
import config from '@/config';
import { renderCal } from '@/utils/cals';

const gitmeshHostedPlans = Plans.values;
const communityPlans = Plans.communityValues;

const intoToGitmeshCal = ({
  displayCalDialog,
}) => {
  displayCalDialog();
  setTimeout(() => {
    renderCal({
      calLink: 'gitmesh/sales',
    });
  }, 0);
};

const customPlanCal = ({
  displayCalDialog,
}) => {
  displayCalDialog();
  setTimeout(() => {
    renderCal({
      calLink: 'gitmesh/sales',
    });
  }, 0);
};

const openCustomerPortalLink = () => {
  window.open(config.stripe.customerPortalLink, '_blank');
};

/**
 * ctaLabel: Copy shown in the CTA dependent on the active plan.
 * Key of ctaLabel represents the active plan, value represents the copy that should appear on the corresponding column plan
 * ctaAction: Action triggered by CTA click dependent on the active plan.
 * Key of ctaAction represents the acttive plan, value represents the set of actions trigerred when the corresponding column plan button is clicked.
 */
export const plans = {
  gitmeshHosted: [
    {
      key: gitmeshHostedPlans.pro,
      title: 'Pro',
      description: 'Build and grow your developer community',
      price: '$299/month',
      priceInfo: 'billed annually',
      features: [
        'Unlimited team seats',
        'Unlimited contacts, organizations & activities',
        '5K monthly active contacts',
        'Connect 15+ platforms: GitHub, Discord, Slack, Discourse, DEV, Reddit, Stack Overflow, Hacker News, LinkedIn & more',
        '10 active automations & CSV exports',
        'Advanced sentiment analysis & engagement scoring',
        'Full REST API access',
        'Custom webhooks & integrations',
        'Email & community support',
      ],
      ctaLabel: {
        [Plans.values.pro]: 'Current Plan',
        [Plans.values.teamsPlus]: 'Downgrade to Pro',
        [Plans.values.enterprise]: 'Downgrade to Pro',
      },
      ctaAction: {
        [Plans.values.pro]: null,
        [Plans.values.teamsPlus]: openCustomerPortalLink,
        [Plans.values.enterprise]: openCustomerPortalLink,
      },
    },
    {
      key: gitmeshHostedPlans.teamsPlus,
      title: 'Teams+',
      description: 'Scale your open source business',
      price: '$1,499/month',
      priceInfo: 'billed annually',
      featuresNote: 'Everything in Pro, plus:',
      features: [
        '25K monthly active contacts',
        'AI-powered contact & organization enrichment',
        'HubSpot, Salesforce & advanced CRM integrations',
        'Unlimited automations & custom workflows',
        'Advanced analytics & custom reports',
        'Activity categorization & topic analysis',
        'Priority Slack support & dedicated onboarding',
      ],
      featuresSpecial: [
        '$75 for each additional 1K MAC',
      ],
      ctaLabel: {
        [Plans.values.pro]: 'Start 14-day trial',
        [Plans.values.teamsPlus]: 'Current Plan',
        [Plans.values.enterprise]: 'Downgrade to Teams+',
      },
      ctaAction: {
        [Plans.values.pro]: intoToGitmeshCal,
        [Plans.values.teamsPlus]: null,
        [Plans.values.enterprise]: openCustomerPortalLink,
      },
    },
    {
      key: gitmeshHostedPlans.enterprise,
      title: 'Enterprise',
      description: 'Enterprise-grade community intelligence',
      price: 'Custom pricing',
      featuresNote: 'Everything in Teams+, plus:',
      features: [
        'Unlimited monthly active contacts',
        'Self-hosted deployment with 99.9% SLA',
        'Custom integrations & data pipelines',
        'Advanced RBAC & SAML/SSO authentication',
        'White-label options & multi-tenant support',
        'Dedicated customer success manager',
        'Professional services & training included',
      ],
      ctaLabel: {
        [Plans.values.pro]: 'Contact Sales',
        [Plans.values.teamsPlus]: 'Contact Sales',
        [Plans.values.enterprise]: 'Current Plan',
      },
      ctaAction: {
        [Plans.values.pro]: customPlanCal,
        [Plans.values.teamsPlus]: customPlanCal,
        [Plans.values.enterprise]: null,
      },
    },
  ],
  community: [
    {
      key: communityPlans.community,
      title: 'Community',
      description:
        "Keep ownership of your data and host GitMesh Community Edition",
      price: 'Free',
      features: [
        'Unlimited seats',
        'Unlimited community contacts & activities',
        'Community management',
        'Community intelligence',
        'Integrations with GitHub, Discord, Slack, X/Twitter, DEV, Hacker News',
        'Community support',
      ],
      ctaLabel: {
        [Plans.communityValues.custom]: 'Downgrage to Community',
      },
      ctaAction: {
        [Plans.communityValues.custom]: openCustomerPortalLink,
      },
    },
    {
      key: communityPlans.custom,
      title: 'Custom',
      description:
        "Get access to GitMesh Enterprise Edition (By Alveoli)",
      price: 'On request',
      featuresNote: 'Everything in Community, plus:',
      features: [
        'Community growth',
        'Organization-level insights',
        'Custom integrations',
        'Enterprise-grade support',
        'LinkedIn integration',
        'Unlimited contact enrichments (automated)',
      ],
      ctaLabel: {
        [Plans.communityValues.community]: 'Book a call',
      },
      ctaAction: {
        [Plans.communityValues.community]: customPlanCal,
      },
    },
  ],
};
