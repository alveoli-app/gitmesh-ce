# Community Edition Signals Module

This directory contains the community edition implementation of the signals functionality. It provides comprehensive signals features that are available to all users without premium restrictions.

## Directory Structure

```
signals/
├── components/           # Vue components for signals functionality
│   ├── layout/          # Layout components
│   ├── list/            # List and filter components
│   ├── form/            # Form components
│   ├── onboard/         # Onboarding flow components
│   └── index.js         # Component exports
├── pages/               # Page components
│   └── index.js         # Page exports
├── store/               # Vuex store module
│   ├── state.js         # Store state
│   ├── mutations.js     # Store mutations
│   ├── actions.js       # Store actions
│   ├── getters.js       # Store getters
│   ├── constants.js     # Store constants
│   └── index.js         # Store module export
├── services/            # Service layer
│   ├── signalsService.js      # API service
│   ├── signalsStorage.js      # Local storage service
│   ├── signalsPermissions.js  # Permissions service
│   └── index.js         # Service exports
├── constants/           # Static data and constants
│   ├── signals-date-published.json
│   ├── signals-platforms.json
│   └── index.js         # Constants exports
├── utils/               # Utility functions and helpers
│   └── index.js         # Utility exports
├── mixins/              # Reusable component mixins
│   └── index.js         # Mixin exports
├── signals-module.js    # Module configuration
├── signals-routes.js    # Route definitions
├── module-config.js     # Extended module configuration
├── index.js            # Main module export
└── README.md           # This file
```

## Features

### Community Edition Features (Available)
- Signals Dashboard - Complete dashboard with data visualization
- Signals Contacts - Full contact management and filtering
- Signals Organizations - Organization monitoring and analytics
- Signals Activities - Activity tracking and analysis
- Signals Automations - Automation configuration and management
- Signals Integrations - Integration setup and monitoring
- Onboarding flow - User onboarding for signals features
- Advanced filtering and search capabilities
- Data visualization and reporting
- Settings and preferences management
- Real-time updates and notifications

### Premium Edition Features (Restricted)
- Sentinel Page (advanced monitoring and AI insights)
- Premium analytics and reporting
- Advanced AI-powered features
- Enterprise-grade integrations

## Usage

The signals module is automatically loaded as part of the main application. Components and services can be imported as needed:

```javascript
// Import components
import { SignalsList, SignalsFilter, SignalsBanner } from '@/modules/signals/components';

// Import pages
import { SignalsHomePage } from '@/modules/signals/pages';

// Import services
import { signalsService } from '@/modules/signals/services';

// Import store
import signalsStore from '@/modules/signals/store';

// Import utilities
import * as signalsUtils from '@/modules/signals/utils';

// Import mixins
import * as signalsMixins from '@/modules/signals/mixins';
```

## Module Configuration

The module includes comprehensive configuration in `module-config.js`:

```javascript
import signalsConfig from '@/modules/signals/module-config';

// Access module metadata
console.log(signalsConfig.info.name); // 'signals'
console.log(signalsConfig.info.version); // '2.0.0'

// Check feature flags
console.log(signalsConfig.features.communitySignals); // true
```

## Migration Status

This structure is fully prepared for the migration from premium-frontend. The expanded directory structure includes:

- ✅ **Components structure** - Ready for all component types
- ✅ **Pages structure** - Ready for all page components  
- ✅ **Store structure** - Complete Vuex module setup
- ✅ **Services structure** - API and business logic services
- ✅ **Constants structure** - Static data and configuration
- ✅ **Utils structure** - Utility functions and helpers
- ✅ **Mixins structure** - Reusable component functionality
- ✅ **Module configuration** - Complete module setup
- ✅ **Documentation** - Comprehensive README and structure docs

## Development

When adding new signals functionality:

1. Add components to the appropriate subdirectory in `components/`
2. Add pages to the `pages/` directory
3. Update store state, mutations, actions, and getters as needed
4. Add services to the `services/` directory
5. Add utilities to the `utils/` directory
6. Add mixins to the `mixins/` directory
7. Update route definitions in `signals-routes.js`
8. Export new modules in the appropriate `index.js` files
9. Update `module-config.js` if adding new features or dependencies

## Testing

Tests should be added alongside components and services following the project's testing conventions. The module structure supports:

- Unit tests for individual components
- Integration tests for page workflows
- Store tests for state management
- Service tests for API interactions
- Utility tests for helper functions