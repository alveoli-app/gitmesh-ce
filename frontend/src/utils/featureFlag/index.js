import { UnleashClient } from 'unleash-proxy-client';
import { useLogRocket } from '@/utils/logRocket';
import config from '@/config';
import { store } from '@/store';

export const FEATURE_FLAGS = {
  signals: 'signals',
  organizations: 'organizations',
  automations: 'automations',
  linkedin: 'linkedin',
  memberEnrichment: 'member-enrichment',
  csvExport: 'csv-export',
  hubspot: 'hubspot',
  logRocket: 'log-rocket',
  developerMode: 'developer-mode',
  quickstartV2: 'quickstart-v2',
  twitter: 'twitter',
};

class FeatureFlagService {
  constructor() {
    this.flags = FEATURE_FLAGS;

    if (!config.isCommunityVersion && config.unleash.url?.length > 0) {
      const unleashConfig = {
        url: `${config.unleash.url}/api/frontend`,
        clientKey: config.unleash.apiKey,
        appName: 'gitmesh-web-app',
        environment: 'production',
      };

      this.unleash = new UnleashClient(unleashConfig);
    }
  }

  async init(tenant) {
    if (config.isCommunityVersion) {
      return;
    }

    // Skip Unleash initialization if URL is not configured
    if (!config.unleash.url || config.unleash.url.length === 0) {
      console.info('Unleash URL not configured, skipping feature flag initialization');
      store.dispatch('tenant/doUpdateFeatureFlag', {
        isReady: true,
      });
      return;
    }

    const { init: initLogRocket, captureException } = useLogRocket();

    // Probe Unleash server before starting the client to avoid repeated
    // failing network requests (metrics POSTs) when the proxy isn't running.
    try {
      // Try a simple GET to the base URL; if connection is refused this will throw.
      // Use no-cors so the probe fails fast on network errors but won't break on CORS.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(config.unleash.url, { method: 'GET', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (err) {
      // Silently handle connection errors - Unleash is optional
      console.warn('Unleash server not available, feature flags will default to enabled');
      store.dispatch('tenant/doUpdateFeatureFlag', {
        isReady: true,
        hasError: false,
      });
      return;
    }

    try {
      this.unleash.start();
    } catch (err) {
      captureException(err);
      store.dispatch('tenant/doUpdateFeatureFlag', {
        isReady: true,
        hasError: false,
      });
      return;
    }

    const context = this.getContextFromTenant(tenant);

    if (context) {
      this.updateContext(context);
    }

    this.unleash.on('ready', () => {
      initLogRocket();

      store.dispatch('tenant/doUpdateFeatureFlag', {
        isReady: true,
      });
    });

    this.unleash.on('error', (error) => {
      captureException(error);

      store.dispatch('tenant/doUpdateFeatureFlag', {
        hasError: true,
      });
    });
  }

  isFlagEnabled(flag) {
    if (config.isCommunityVersion) {
      return true;
    }

    // If Unleash client isn't initialized, default to enabled
    if (!this.unleash) {
      return true;
    }

    // Temporary workaround for Unleash connectivity issues
    // Check if user has premium plans for specific features
    let currentTenant = null;
    
    // Try multiple ways to get current tenant
    if (window.store?.state?.auth?.currentTenant) {
      currentTenant = window.store.state.auth.currentTenant;
    } else if (store?.state?.auth?.currentTenant) {
      currentTenant = store.state.auth.currentTenant;
    }
    
    if (currentTenant && flag === 'signals') {
      const premiumPlans = ['Growth', 'Signals', 'Scale', 'Enterprise'];
      const hasPremiumPlan = premiumPlans.includes(currentTenant.plan);
      console.log(`📡 Signals Workaround: Plan="${currentTenant.plan}", HasAccess=${hasPremiumPlan}`);
      if (hasPremiumPlan) return true;
    }

    try {
      return this.unleash.isEnabled(flag);
    } catch (err) {
      // If Unleash throws, default to enabled
      console.warn(`Feature flag check failed for ${flag}, defaulting to enabled`);
      return true;
    }
  }

  updateContext(tenant) {
    if (config.isCommunityVersion) {
      return;
    }

    const context = this.getContextFromTenant(tenant);
    if (context) {
      this.unleash.updateContext(context);
    }
  }

  getContextFromTenant(tenant) {
    if (!tenant || !tenant.id) {
      return null;
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      isTrialPlan: tenant.isTrialPlan,
      email: tenant.email,
      automationCount: `${tenant.automationCount}`,
      csvExportCount: `${tenant.csvExportCount}`,
      memberEnrichmentCount: `${tenant.memberEnrichmentCount}`,
      plan: tenant.plan,
    };
  }

  premiumFeatureCopy() {
    if (config.isCommunityVersion) {
      return 'Enterprise';
    }
    return 'Scale';
  }

  scaleFeatureCopy() {
    if (config.isCommunityVersion) {
      return 'Enterprise';
    }
    return 'Scale';
  }
}

export const FeatureFlag = new FeatureFlagService();
