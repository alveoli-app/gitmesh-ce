import { MenuLink } from '@/modules/layout/types/MenuLink';
import { FeatureFlag } from '@/utils/featureFlag';
import config from '@/config';
import home from './links/home';
import contacts from './links/contacts';
import organizations from './links/organizations';
import activities from './links/activities';
import reports from './links/reports';
import automations from './links/automations';
import integrations from './links/integrations';
import shareFeedback from './links/share-feedback';
import documentation from './links/documentation';
import changelog from './links/changelog';
import community from './links/community';
import usersPermissions from './links/users-permissions';
import apiKeys from './links/api-keys';
import plansBilling from './links/plans-billing';

import * as chatLinks from './links/chat-links';
import * as devspaceLinks from './links/devspace-links';

// Signals tab menu: includes sentinel conditionally for premium users
export const signalsMainMenu: MenuLink[] = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: 'ri-home-5-line',
    routeName: 'signals-dashboard',
    display: () => true,
    disable: () => false,
  },
  contacts,
  organizations,
  activities,
  {
    id: 'sentinel',
    label: 'Sentinel',
    icon: 'ri-shield-line',
    routeName: 'signals-sentinel',
    display: ({ user, tenant }) => {
      // Sentinel is only available in Enterprise Edition (premium)
      if (config.isCommunityVersion) {
        return false;
      }
      
      // Check if signals sentinel feature flag is enabled (enterprise edition only)
      if (!FeatureFlag.isFlagEnabled(FeatureFlag.flags.signalsSentinel)) {
        return false;
      }
      
      // Check if user has enterprise plan
      if (tenant) {
        const enterprisePlans = ['Pro', 'Teams+', 'Enterprise'];
        return enterprisePlans.includes(tenant.plan);
      }
      
      // Default to false if no tenant info available
      return false;
    },
    disable: () => false,
  },
  automations,
  integrations,
];

// For backward compatibility, keep sentinel menus pointing to the signals structure
// Note: Sentinel functionality is available for enterprise plans only
export const sentinelMainMenu: MenuLink[] = signalsMainMenu;
export const sentinelBottomMenu: MenuLink[] = [];

// Chat-only menu (premium edition only)
export const chatMenu: MenuLink[] = [
  chatLinks.conversations,
  chatLinks.agents,
  chatLinks.actions,
  chatLinks.insights,
];

// DevSpace menu (available in all editions - community and premium)
export const devspaceMenu: MenuLink[] = [
  devspaceLinks.overview,
  devspaceLinks.board,
  devspaceLinks.backlog,
  devspaceLinks.cycles,
  devspaceLinks.capacity,
  devspaceLinks.specs,
  devspaceLinks.team,
  devspaceLinks.devtel,
  devspaceLinks.projectSettings,
];

// Backwards-compatible exports (default to Signals menus)
export const mainMenu: MenuLink[] = signalsMainMenu;
export const bottomMenu: MenuLink[] = [];

// Legacy exports for backward compatibility
// Note: signalsMainMenu is now the primary menu, sentinelMainMenu points to it

// Support menu
export const supportMenu: MenuLink[] = [
  shareFeedback,
  documentation,
  changelog,
  community,
];

// Tenant menu
export const tenantMenu: MenuLink[] = [
  usersPermissions,
  apiKeys,
  plansBilling,
];
