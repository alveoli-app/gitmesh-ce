import { isFeatureEnabled } from '@gitmesh/feature-flags'
import { FeatureFlag } from '@gitmesh/types'
import Plans from '../security/plans'
import getFeatureFlagTenantContext from './getFeatureFlagTenantContext'

export const PLAN_LIMITS = {
  'Pro': {
    [FeatureFlag.AUTOMATIONS]: 10,
    [FeatureFlag.CSV_EXPORT]: 10,
    [FeatureFlag.MEMBER_ENRICHMENT]: 1000,
    [FeatureFlag.ORGANIZATION_ENRICHMENT]: 200,
  },
  'Teams+': {
    [FeatureFlag.AUTOMATIONS]: 20,
    [FeatureFlag.CSV_EXPORT]: 20,
    [FeatureFlag.MEMBER_ENRICHMENT]: Infinity,
    [FeatureFlag.ORGANIZATION_ENRICHMENT]: Infinity,
  },
  'Enterprise': {
    [FeatureFlag.AUTOMATIONS]: Infinity,
    [FeatureFlag.CSV_EXPORT]: Infinity,
    [FeatureFlag.MEMBER_ENRICHMENT]: Infinity,
    [FeatureFlag.ORGANIZATION_ENRICHMENT]: Infinity,
  },
}

export default async (featureFlag: FeatureFlag, req: any): Promise<boolean> => {
  if (!req.unleash) {
    return true
  }

  // For signals feature, allow all enterprise edition plans without Unleash check
  // This ensures Pro, Teams+, and Enterprise plans have access
  if (featureFlag === FeatureFlag.SIGNALS) {
    const tenantPlan = req.currentTenant?.plan
    const enterprisePlans = [
      'Pro',
      'Teams+', 
      'Enterprise'
    ]
    
    if (enterprisePlans.includes(tenantPlan)) {
      return true
    }
  }

  // For signals sentinel feature, allow only enterprise edition plans
  // This is the premium-only sentinel page functionality
  if (featureFlag === FeatureFlag.SIGNALS_SENTINEL) {
    const tenantPlan = req.currentTenant?.plan
    const enterprisePlans = [
      'Pro',
      'Teams+', 
      'Enterprise'
    ]
    
    if (enterprisePlans.includes(tenantPlan)) {
      return true
    }
    
    // Explicitly deny access for non-enterprise plans
    return false
  }

  // For agentic chat feature, allow all enterprise edition plans
  if (featureFlag === FeatureFlag.AGENTIC_CHAT) {
    const tenantPlan = req.currentTenant?.plan
    const enterprisePlans = [
      'Pro',
      'Teams+', 
      'Enterprise'
    ]
    
    if (enterprisePlans.includes(tenantPlan)) {
      return true
    }
  }

  return isFeatureEnabled(
    featureFlag,
    async () => getFeatureFlagTenantContext(req.currentTenant, req.database, req.redis, req.log),
    req.unleash,
  )
}
