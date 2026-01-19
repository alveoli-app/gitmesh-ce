import { PLANS_CONFIG } from '../conf'

class Plans {
  static get values() {
    return {
      pro: 'Pro',
      teamsPlus: 'Teams+',
      enterprise: 'Enterprise',
    }
  }

  static selectPlanByStripePriceId(stripePriceId) {
    const premiumStripePriceId = PLANS_CONFIG.stripePricePremium

    if (premiumStripePriceId === stripePriceId) {
      return Plans.values.pro
    }

    return Plans.values.pro
  }

  static selectStripePriceIdByPlan(plan) {
    if (plan === Plans.values.pro || plan === Plans.values.teamsPlus || plan === Plans.values.enterprise) {
      return PLANS_CONFIG.stripePricePremium
    }

    return null
  }

  /**
   * When the plan is:
   * - active: The plan will be active.
   * - cancel_at_period_end: The plan will remain active until the end of the period.
   * - error: The plan will remain active, but a warning message will be displayed to the user.
   * - canceled: The workspace plan will change to Free.
   */
  static selectPlanStatus(stripePlan) {
    if (!stripePlan) {
      return 'canceled'
    }

    const { status, cancelAtPeriodEnd } = stripePlan

    if (status === 'active') {
      if (cancelAtPeriodEnd) {
        return 'cancel_at_period_end'
      }

      return 'active'
    }

    if (status === 'canceled' || status === 'incomplete_expired') {
      return 'canceled'
    }

    return 'error'
  }

  /**
   * If the plan exists and it is not marked
   * to cancel, the tenant can't be destroyed,
   * because future charges might occur
   */
  static allowTenantDestroy(plan, planStatus) {
    if (plan === Plans.values.pro || plan === Plans.values.teamsPlus || plan === Plans.values.enterprise) {
      return planStatus === 'cancel_at_period_end'
    }

    return true
  }
}

export default Plans
