"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("@gitmesh/logging");
const sequelizeRepository_1 = __importDefault(require("../database/repositories/sequelizeRepository"));
class MaterializedViewService extends logging_1.LoggerBase {
    constructor(options) {
        super(options.log);
        this.options = options;
    }
    async refreshActivityCube() {
        const sequelize = sequelizeRepository_1.default.getSequelize(this.options);
        this.log.info('Refreshing mv_activities_cube materialized view');
        await sequelize.query('REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_activities_cube"', {
            useMaster: true,
        });
        this.log.info('Successfully refreshed mv_activities_cube materialized view');
    }
    async refreshOrganizationCube() {
        const sequelize = sequelizeRepository_1.default.getSequelize(this.options);
        this.log.info('Refreshing mv_organizations_cube materialized view');
        await sequelize.query('REFRESH MATERIALIZED VIEW CONCURRENTLY "mv_organizations_cube"', {
            useMaster: true,
        });
        this.log.info('Successfully refreshed mv_organizations_cube materialized view');
    }
    async refreshAllCubes() {
        const sequelize = sequelizeRepository_1.default.getSequelize(this.options);
        const materializedViews = [
            'mv_members_cube',
            'mv_activities_cube',
            'mv_organizations_cube',
            'mv_segments_cube',
        ];
        this.log.info('Refreshing all cube materialized views');
        for (const view of materializedViews) {
            this.log.info(`Refreshing ${view}`);
            await sequelize.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY "${view}"`, {
                useMaster: true,
            });
        }
        this.log.info('Successfully refreshed all cube materialized views');
    }
}
exports.default = MaterializedViewService;
//# sourceMappingURL=materializedViewService.js.map