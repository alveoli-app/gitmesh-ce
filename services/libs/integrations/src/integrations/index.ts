export * from './activityTypes'
export * from './prettyActivityTypes'
export * from './services'
export * from './memberAttributes'
export * from './nango'

export * from './devto/grid'
export * from './devto/types'
export * from './devto/memberAttributes'

export * from './discord/grid'
export * from './discord/types'
export * from './discord/memberAttributes'

export * from './discourse/grid'
export * from './discourse/types'
export * from './discourse/memberAttributes'

export * from './github/grid'
export * from './github/types'
export * from './github/memberAttributes'

export * from './hackernews/grid'
export * from './hackernews/types'
export * from './hackernews/memberAttributes'
export * from './hackernews/grid'
export * from './hackernews/types'
export * from './hackernews/memberAttributes'

// Premium integrations are optional in community edition. Attempt to load
// them only if the module files exist; silently skip when missing.
const tryExport = (p: string) => {
	try {
		// Use require to load at runtime; merge into exports for compatibility
		// with existing `export *` usage.
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mod = require(p)
		if (mod) {
			Object.keys(mod).forEach(k => {
				// @ts-ignore
				exports[k] = mod[k]
			})
		}
	} catch (err: any) {
		if (err && err.code && err.code === 'MODULE_NOT_FOUND') {
			// module absent — skip silently for community edition
			return
		}
		// rethrow unexpected errors
		throw err
	}
}

tryExport('./premium/linkedin/grid')
tryExport('./premium/linkedin/types')
tryExport('./premium/linkedin/memberAttributes')

tryExport('./premium/hubspot/types')
tryExport('./premium/hubspot/api/types')
tryExport('./premium/hubspot/field-mapper/mapperFactory')
tryExport('./premium/hubspot/api/properties')
tryExport('./premium/hubspot/api/tokenInfo')
tryExport('./premium/hubspot/api/lists')

export * from './reddit/grid'
export * from './reddit/types'
export * from './reddit/memberAttributes'

export * from './slack/grid'
export * from './slack/types'
export * from './slack/memberAttributes'

export * from './twitter/grid'
export * from './twitter/types'
export * from './twitter/memberAttributes'

export * from './groupsio/grid'
export * from './groupsio/types'
export * from './groupsio/memberAttributes'
export * from './activityDisplayService'
