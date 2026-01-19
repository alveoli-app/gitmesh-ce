import Roles from './roles'
import Plans from './plans'
import Storage from './storage'

const storage = Storage.values
const roles = Roles.values
const plans = Plans.values

class Permissions {
  static get values() {
    return {
      tenantEdit: {
        id: 'tenantEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      tenantDestroy: {
        id: 'tenantDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      planEdit: {
        id: 'planEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      planRead: {
        id: 'planRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      userEdit: {
        id: 'userEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      userDestroy: {
        id: 'userDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      userCreate: {
        id: 'userCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      userImport: {
        id: 'userImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      userRead: {
        id: 'userRead',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      userAutocomplete: {
        id: 'userAutocomplete',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      auditLogRead: {
        id: 'auditLogRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      settingsRead: {
        id: 'settingsRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [storage.settingsBackgroundImages, storage.settingsLogos],
      },
      settingsEdit: {
        id: 'settingsEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [storage.settingsBackgroundImages, storage.settingsLogos],
      },
      memberAttributesRead: {
        id: 'memberAttributesRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      memberAttributesEdit: {
        id: 'memberAttributesEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      memberAttributesDestroy: {
        id: 'memberAttributesDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      memberAttributesCreate: {
        id: 'memberAttributesCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      memberImport: {
        id: 'memberImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      memberCreate: {
        id: 'memberCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      memberEdit: {
        id: 'memberEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      memberDestroy: {
        id: 'memberDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      memberRead: {
        id: 'memberRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      memberAutocomplete: {
        id: 'memberAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      activityImport: {
        id: 'activityImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      activityCreate: {
        id: 'activityCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      activityEdit: {
        id: 'activityEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      activityDestroy: {
        id: 'activityDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      activityRead: {
        id: 'activityRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      activityAutocomplete: {
        id: 'activityAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      automationCreate: {
        id: 'automationCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      automationUpdate: {
        id: 'automationUpdate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      automationDestroy: {
        id: 'automationDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      automationRead: {
        id: 'automationRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      tagImport: {
        id: 'tagImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      tagCreate: {
        id: 'tagCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      tagEdit: {
        id: 'tagEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      tagDestroy: {
        id: 'tagDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      tagRead: {
        id: 'tagRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      tagAutocomplete: {
        id: 'tagAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      organizationImport: {
        id: 'organizationImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      organizationCreate: {
        id: 'organizationCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      organizationEdit: {
        id: 'organizationEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      organizationDestroy: {
        id: 'organizationDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      organizationRead: {
        id: 'organizationRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      organizationAutocomplete: {
        id: 'organizationAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      widgetImport: {
        id: 'widgetImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      widgetCreate: {
        id: 'widgetCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      widgetEdit: {
        id: 'widgetEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      widgetDestroy: {
        id: 'widgetDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      widgetRead: {
        id: 'widgetRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      widgetAutocomplete: {
        id: 'widgetAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      reportImport: {
        id: 'reportImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      reportCreate: {
        id: 'reportCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      reportEdit: {
        id: 'reportEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      reportDestroy: {
        id: 'reportDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      reportRead: {
        id: 'reportRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      reportAutocomplete: {
        id: 'reportAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      integrationImport: {
        id: 'integrationImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      integrationControlLimit: {
        id: 'integrationControlLimit',
        allowedRoles: [],
        allowedPlans: [],
      },
      integrationCreate: {
        id: 'integrationCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      integrationEdit: {
        id: 'integrationEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      integrationDestroy: {
        id: 'integrationDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      integrationRead: {
        id: 'integrationRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      integrationAutocomplete: {
        id: 'integrationAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      microserviceImport: {
        id: 'microserviceImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      microserviceCreate: {
        id: 'microserviceCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      microserviceEdit: {
        id: 'microserviceEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      microserviceDestroy: {
        id: 'microserviceDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      microserviceRead: {
        id: 'microserviceRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      microserviceAutocomplete: {
        id: 'microserviceAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      microserviceVariantFree: {
        id: 'microserviceVariantFree',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      microserviceVariantPremium: {
        id: 'microserviceVariantPremium',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [plans.teamsPlus, plans.enterprise],
      },
      conversationCreate: {
        id: 'conversationCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      conversationEdit: {
        id: 'conversationEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      conversationDestroy: {
        id: 'conversationDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      conversationRead: {
        id: 'conversationRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      signalsActionCreate: {
        id: 'signalsActionCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      signalsActionDestroy: {
        id: 'signalsActionDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      signalsContentCreate: {
        id: 'signalsContentCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      signalsContentRead: {
        id: 'signalsContentRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      signalsContentSearch: {
        id: 'signalsContentSearch',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      signalsContentEdit: {
        id: 'signalsContentEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      taskImport: {
        id: 'taskImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      taskCreate: {
        id: 'taskCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      taskEdit: {
        id: 'taskEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      taskDestroy: {
        id: 'taskDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      taskRead: {
        id: 'taskRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      taskAutocomplete: {
        id: 'taskAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      taskBatch: {
        id: 'taskBatch',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      noteImport: {
        id: 'noteImport',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      noteCreate: {
        id: 'noteCreate',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      noteEdit: {
        id: 'noteEdit',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      noteDestroy: {
        id: 'noteDestroy',
        allowedRoles: [roles.admin],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
        allowedStorage: [],
      },
      noteRead: {
        id: 'noteRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      noteAutocomplete: {
        id: 'noteAutocomplete',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      quickstartGuideRead: {
        id: 'quickstartGuideRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      quickstartGuideSettingsUpdate: {
        id: 'quickstartGuideSettingsUpdate',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      segmentRead: {
        id: 'segmentRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      segmentCreate: {
        id: 'segmentCreate',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      segmentEdit: {
        id: 'segmentEdit',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      customViewCreate: {
        id: 'customViewCreate',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      customViewEdit: {
        id: 'customViewEdit',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      customViewDestroy: {
        id: 'customViewDestroy',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
      customViewRead: {
        id: 'customViewRead',
        allowedRoles: [roles.admin, roles.readonly],
        allowedPlans: [
          plans.pro,
          plans.teamsPlus,
          plans.enterprise,
        ],
      },
    }
  }

  static get asArray() {
    return Object.keys(this.values).map((value) => this.values[value])
  }
}

export default Permissions
