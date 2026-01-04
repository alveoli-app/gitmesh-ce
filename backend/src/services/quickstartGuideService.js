"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const lodash_1 = __importDefault(require("lodash"));
const logging_1 = require("@gitmesh/logging");
const types_1 = require("@gitmesh/types");
const isFeatureEnabled_1 = __importDefault(require("../feature-flags/isFeatureEnabled"));
const quickstartGuideTypes_1 = require("../types/quickstartGuideTypes");
const integrationRepository_1 = __importDefault(require("../database/repositories/integrationRepository"));
const memberService_1 = __importDefault(require("./memberService"));
const tenantUserRepository_1 = __importDefault(require("../database/repositories/tenantUserRepository"));
const reportRepository_1 = __importDefault(require("../database/repositories/reportRepository"));
const automationRepository_1 = __importDefault(require("../database/repositories/automationRepository"));
const settingsRepository_1 = __importDefault(require("../database/repositories/settingsRepository"));
class QuickstartGuideService extends logging_1.LoggerBase {
    constructor(options) {
        super(options.log);
        this.options = options;
    }
    async updateSettings(settings) {
        const quickstartGuideSettings = lodash_1.default.pick(settings, [
            'isSignalsGuideDismissed',
            'isQuickstartGuideDismissed',
        ]);
        const tenantUser = await tenantUserRepository_1.default.updateSettings(this.options.currentUser.id, quickstartGuideSettings, this.options);
        return tenantUser;
    }
    async find() {
        var _a, _b;
        // Default to V2 guides for community edition or when feature flags are not available
        let isGuidesV2Enabled = true;
        try {
            isGuidesV2Enabled = await (0, isFeatureEnabled_1.default)(types_1.FeatureFlag.QUICKSTART_V2, this.options);
        }
        catch (error) {
            this.log.warn(error, 'Failed to check QUICKSTART_V2 feature flag, using V2 guides by default');
        }
        const guides = JSON.parse(JSON.stringify(isGuidesV2Enabled ? quickstartGuideTypes_1.DEFAULT_GUIDES_V2 : quickstartGuideTypes_1.DEFAULT_GUIDES));
        this.log.info(guides);
        // If no segments are available, return empty guides (tenant not fully set up yet)
        if (!this.options.currentSegments || this.options.currentSegments.length === 0) {
            this.log.warn('No segments available for quickstart guide, returning empty progress');
            return guides;
        }
        let integrationCount = 0;
        try {
            integrationCount = await integrationRepository_1.default.count({}, this.options);
        }
        catch (error) {
            this.log.warn(error, 'Failed to get integration count for quickstart guide');
        }
        const ms = new memberService_1.default(this.options);
        if (quickstartGuideTypes_1.QuickstartGuideType.CONNECT_INTEGRATION in guides) {
            guides[quickstartGuideTypes_1.QuickstartGuideType.CONNECT_INTEGRATION].completed = integrationCount > 1;
        }
        if (quickstartGuideTypes_1.QuickstartGuideType.ENRICH_MEMBER in guides) {
            try {
                const enrichedMembers = await ms.findAndCountAll({
                    advancedFilter: { enrichedBy: { contains: [this.options.currentUser.id] } },
                    limit: 1,
                });
                guides[quickstartGuideTypes_1.QuickstartGuideType.ENRICH_MEMBER].completed = enrichedMembers.count > 0;
            }
            catch (error) {
                this.log.warn(error, 'Failed to check enriched members for quickstart guide');
            }
        }
        if (quickstartGuideTypes_1.QuickstartGuideType.VIEW_REPORT in guides) {
            try {
                const viewedReports = await reportRepository_1.default.findAndCountAll({ advancedFilter: { viewedBy: { contains: [this.options.currentUser.id] } } }, this.options);
                guides[quickstartGuideTypes_1.QuickstartGuideType.VIEW_REPORT].completed = viewedReports.count > 0;
            }
            catch (error) {
                this.log.warn(error, 'Failed to check viewed reports for quickstart guide');
            }
        }
        if (quickstartGuideTypes_1.QuickstartGuideType.INVITE_COLLEAGUES in guides) {
            try {
                const allTenantUsers = await tenantUserRepository_1.default.findByTenant(this.options.currentTenant.id, this.options);
                guides[quickstartGuideTypes_1.QuickstartGuideType.INVITE_COLLEAGUES].completed = allTenantUsers.some((tu) => tu.invitedById === this.options.currentUser.id);
            }
            catch (error) {
                this.log.warn(error, 'Failed to check invited colleagues for quickstart guide');
            }
        }
        if (quickstartGuideTypes_1.QuickstartGuideType.CONNECT_FIRST_INTEGRATION in guides) {
            guides[quickstartGuideTypes_1.QuickstartGuideType.CONNECT_FIRST_INTEGRATION].completed = integrationCount > 0;
        }
        if (quickstartGuideTypes_1.QuickstartGuideType.CREATE_AUTOMATIONS in guides) {
            try {
                const automations = await new automationRepository_1.default(this.options).findAndCountAll({});
                guides[quickstartGuideTypes_1.QuickstartGuideType.CREATE_AUTOMATIONS].completed = automations.count > 0;
            }
            catch (error) {
                this.log.warn(error, 'Failed to check automations for quickstart guide');
            }
        }
        if (quickstartGuideTypes_1.QuickstartGuideType.EXPLORE_ORGANIZATIONS in guides ||
            quickstartGuideTypes_1.QuickstartGuideType.EXPLORE_CONTACTS in guides) {
            try {
                const tenantSettings = await settingsRepository_1.default.getTenantSettings(this.options.currentTenant.id, this.options);
                if (quickstartGuideTypes_1.QuickstartGuideType.EXPLORE_ORGANIZATIONS in guides) {
                    guides[quickstartGuideTypes_1.QuickstartGuideType.EXPLORE_ORGANIZATIONS].completed =
                        (tenantSettings === null || tenantSettings === void 0 ? void 0 : tenantSettings.organizationsViewed) || false;
                }
                if (quickstartGuideTypes_1.QuickstartGuideType.EXPLORE_CONTACTS in guides) {
                    guides[quickstartGuideTypes_1.QuickstartGuideType.EXPLORE_CONTACTS].completed = (tenantSettings === null || tenantSettings === void 0 ? void 0 : tenantSettings.contactsViewed) || false;
                }
            }
            catch (error) {
                this.log.warn(error, 'Failed to check tenant settings for quickstart guide');
            }
        }
        // Check if SIGNALS feature is enabled
        let isSignalsEnabled = false;
        try {
            isSignalsEnabled = await (0, isFeatureEnabled_1.default)(types_1.FeatureFlag.SIGNALS, this.options);
        }
        catch (error) {
            this.log.warn(error, 'Failed to check SIGNALS feature flag');
        }
        if (quickstartGuideTypes_1.QuickstartGuideType.SET_SIGNALS in guides && isSignalsEnabled) {
            try {
                const tenantUser = await tenantUserRepository_1.default.findByTenantAndUser(this.options.currentTenant.id, this.options.currentUser.id, this.options);
                guides[quickstartGuideTypes_1.QuickstartGuideType.SET_SIGNALS].completed = ((_b = (_a = tenantUser === null || tenantUser === void 0 ? void 0 : tenantUser.settings) === null || _a === void 0 ? void 0 : _a.signals) === null || _b === void 0 ? void 0 : _b.onboarded) || false;
            }
            catch (error) {
                this.log.warn(error, 'Failed to check signals settings for quickstart guide');
            }
        }
        else {
            delete guides[quickstartGuideTypes_1.QuickstartGuideType.SET_SIGNALS];
        }
        // try to find an enrichable member for button CTA of enrich member guide
        if (quickstartGuideTypes_1.QuickstartGuideType.ENRICH_MEMBER in guides &&
            !guides[quickstartGuideTypes_1.QuickstartGuideType.ENRICH_MEMBER].completed) {
            try {
                const enrichableMembers = await ms.findAndCountAll({
                    advancedFilter: {
                        and: [
                            {
                                or: [
                                    {
                                        emails: {
                                            ne: sequelize_1.Sequelize.literal("'{}'"),
                                        },
                                    },
                                    {
                                        identities: {
                                            contains: ['github'],
                                        },
                                    },
                                ],
                            },
                            {
                                enrichedBy: {
                                    eq: sequelize_1.Sequelize.literal("'{}'"),
                                },
                            },
                        ],
                    },
                    limit: 1,
                });
                if (enrichableMembers.count > 0) {
                    guides[quickstartGuideTypes_1.QuickstartGuideType.ENRICH_MEMBER].buttonLink = `/contacts/${enrichableMembers.rows[0].id}`;
                }
            }
            catch (error) {
                this.log.warn(error, 'Failed to find enrichable members for quickstart guide');
            }
        }
        return guides;
    }
}
exports.default = QuickstartGuideService;
//# sourceMappingURL=quickstartGuideService.js.map