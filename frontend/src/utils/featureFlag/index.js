import { UnleashClient } from 'unleash-proxy-client';
import { useLogRocket } from '@/utils/logRocket';
import config from '@/config';
import { store } from '@/store';

export const FEATURE_FLAGS = {
  signals: 'signals',
  signalsSentinel: 'signals-sentinel', // Premium-only sentinel page
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
  agenticChat: 'agentic-chat',
};

class FeatureFlagService {
  constructor() {
    this.flags = FEATURE_FLAGS;

    console.log('FeatureFlagService: Initializing with config', {
      edition: config.edition,
      isCommunityVersion: config.isCommunityVersion,
      hasPremiumModules: config.hasPremiumModules,
      unleashUrl: config.unleash.url
    });

    // Log edition status for debugging purposes
    if (config.isCommunityVersion) {
      console.log('FeatureFlagService: Running in Community Edition (gitmesh) - premium features disabled');
    } else {
      console.log(`FeatureFlagService: Running in Enterprise Edition (${config.edition}) - all features enabled`);
    }

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
      this.unleash = null;
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
      this.unleash = null;
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
    // Log edition status for debugging
    console.log('FeatureFlagService: Edition check', {
      edition: config.edition,
      isCommunityVersion: config.isCommunityVersion,
      flag: flag
    });

    // Edition-based logic takes precedence over external services
    if (config.isCommunityVersion) {
      // Community Edition (gitmesh): Handle signals and premium features differently
      
      // Signals base functionality is available in Community Edition
      if (flag === FEATURE_FLAGS.signals) {
        console.log(`FeatureFlagService: Community Edition - enabling signals base functionality`);
        return true;
      }
      
      // Premium-only features disabled in Community Edition
      if (flag === FEATURE_FLAGS.signalsSentinel || flag === FEATURE_FLAGS.agenticChat) {
        console.log(`FeatureFlagService: Community Edition - disabling premium feature ${flag}`);
        return false;
      }
      
      // Other features enabled in Community Edition
      console.log(`FeatureFlagService: Community Edition - enabling non-premium feature ${flag}`);
      return true;
    }

    // Enterprise Edition (ee/premium): enable all features by default
    console.log(`FeatureFlagService: Enterprise Edition - evaluating feature ${flag}`);
    
    // For Enterprise Edition, check plan-based access for premium signals features
    if (flag === FEATURE_FLAGS.signals || flag === FEATURE_FLAGS.signalsSentinel) {
      console.log(`🏢 Enterprise Edition - checking ${flag} feature access`);
      
      let currentTenant = null;
      
      // Try multiple ways to get current tenant
      if (window.store?.state?.auth?.currentTenant) {
        currentTenant = window.store.state.auth.currentTenant;
      } else if (store?.state?.auth?.currentTenant) {
        currentTenant = store.state.auth.currentTenant;
      }
      
      console.log('- Current tenant:', currentTenant);
      
      if (currentTenant) {
        // All enterprise edition plans have access to signals: Pro, Teams+, Enterprise
        const enterprisePlans = ['Pro', 'Teams+', 'Enterprise'];
        const hasEnterprisePlan = enterprisePlans.includes(currentTenant.plan);
        console.log(`- Plan check for ${flag} - Plan="${currentTenant.plan}", HasAccess=${hasEnterprisePlan}`);
        console.log('- Enterprise plans:', enterprisePlans);
        
        if (!hasEnterprisePlan) {
          console.log(`❌ Plan ${currentTenant.plan} does not have access to ${flag}`);
          return false;
        }
        
        console.log(`✅ Plan ${currentTenant.plan} has access to ${flag}`);
        return true;
      } else {
        console.log(`⚠️ No tenant found, defaulting to enabled for Enterprise Edition feature ${flag}`);
        // In Enterprise Edition, if no tenant is found, enable signals by default
        return true;
      }
    }
    
    // For other features in Enterprise Edition, check Unleash if available
    if (this.unleash) {
      try {
        const unleashResult = this.unleash.isEnabled(flag);
        console.log(`FeatureFlagService: Unleash result for ${flag}: ${unleashResult}`);
        return unleashResult;
      } catch (err) {
        // If Unleash throws, default to enabled for Enterprise Edition
        console.warn(`FeatureFlagService: Unleash check failed for ${flag}, defaulting to enabled`, err);
        return true;
      }
    }
    
    // If Unleash client isn't initialized, default to enabled for Enterprise Edition
    console.log(`FeatureFlagService: No Unleash client, defaulting to enabled for Enterprise Edition feature ${flag}`);
    return true;
  }

  updateContext(tenant) {
    if (config.isCommunityVersion) {
      return;
    }

    if (!this.unleash) {
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
    return 'Teams+';
  }

  scaleFeatureCopy() {
    if (config.isCommunityVersion) {
      return 'Enterprise';
    }
    return 'Teams+';
  }
}

export const FeatureFlag = new FeatureFlagService();
