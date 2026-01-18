import shared from '@/shared/shared-module';
import auth from '@/modules/auth/auth-module';
import layout from '@/modules/layout/layout-module';
import dashboard from '@/modules/dashboard/dashboard-module';
import signals from '@/modules/signals/signals-module';
import onboard from '@/modules/onboard/onboard-module';
import tenant from '@/modules/tenant/tenant-module';
import settings from '@/modules/settings/settings-module';
import integration from '@/modules/integration/integration-module';
import member from '@/modules/member/member-module';
import tag from '@/modules/tag/tag-module';
import activity from '@/modules/activity/activity-module';
import widget from '@/modules/widget/widget-module';
import report from '@/modules/report/report-module';
import automation from '@/modules/automation/automation-module';
import organization from '@/modules/organization/organization-module';
import task from '@/modules/task/task-module';
import quickstart from '@/modules/quickstart/quickstart-module';
import user from '@/modules/user/user-module';
import landing from '@/modules/landing/landing-module';
import devtel from '@/modules/devspace/devtel-module';

// Dynamically import premium modules to allow removing the premium directory
// Only load premium modules if they exist and we're in EE mode
const shouldLoadPremiumModules = import.meta.env.VUE_APP_EDITION === 'gitmesh-ee' || 
                                 import.meta.env.EDITION === 'gitmesh-ee' ||
                                 import.meta.env.NODE_ENV === 'ee';

let premiumModules: Record<string, any> = {};

if (shouldLoadPremiumModules) {
  try {
    const premiumModulesGlob = import.meta.glob('../premium/*/*-module.js', { eager: true });
    premiumModules = Object.keys(premiumModulesGlob).reduce((acc, key) => {
      // Extract module name from path (e.g., ../premium/signals/signals-module.js -> signals)
      const parts = key.split('/');
      // parts = ["..", "premium", "signals", "signals-module.js"]
      // We want "signals" which is at index 2 (or length - 2)
      const moduleName = parts[parts.length - 2];
      acc[moduleName] = (premiumModulesGlob[key] as any).default;
      return acc;
    }, {} as Record<string, any>);
  } catch (error) {
    console.warn('Premium modules not available:', error);
    premiumModules = {};
  }
}

const modules: Record<string, any> = {
  landing, // Register landing first so / route takes precedence
  shared,
  dashboard,
  signals,
  onboard,
  settings,
  auth,
  tenant,
  layout,
  integration,
  member,
  activity,
  tag,
  widget,
  report,
  automation,
  organization,
  task,
  quickstart,
  user,
  devtel,
};

// Merge premium modules with community modules only if premium modules are loaded
if (shouldLoadPremiumModules && Object.keys(premiumModules).length > 0) {
  Object.keys(premiumModules).forEach(moduleName => {
    const premiumModule = premiumModules[moduleName];
    const communityModule = modules[moduleName];
    
    if (moduleName === 'signals' && communityModule && premiumModule) {
      // Special handling for signals: merge routes with premium routes taking precedence
      modules[moduleName] = {
        ...communityModule,
        routes: [
          ...(premiumModule.routes || []),
          ...(communityModule.routes || [])
        ]
      };
    } else {
      // For other modules, use premium module as-is (override behavior)
      modules[moduleName] = premiumModule;
    }
  });
}

export default modules;
