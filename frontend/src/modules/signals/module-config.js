// Community Edition Signals Module Configuration
// This file defines the complete module structure and configuration

import signalsModule from './signals-module';
import signalsRoutes from './signals-routes';
import signalsStore from './store';

// Module metadata
export const moduleInfo = {
  name: 'signals',
  version: '2.0.0',
  description: 'Community Edition Signals Module - Full signals functionality for all users',
  edition: 'community',
  dependencies: [
    '@/modules/layout',
    '@/modules/dashboard',
    '@/modules/member',
    '@/modules/organization',
    '@/modules/activity',
    '@/modules/automation',
    '@/modules/integration'
  ]
};

// Directory structure documentation
export const moduleStructure = {
  components: {
    layout: 'Layout components for signals pages',
    list: 'List and filter components',
    form: 'Form components for signals configuration',
    onboard: 'Onboarding flow components'
  },
  pages: 'Page components for each signals sub-tab',
  store: 'Vuex store module for signals state management',
  services: 'API services and business logic',
  constants: 'Static data and configuration constants',
  utils: 'Utility functions and helpers',
  mixins: 'Reusable component mixins'
};

// Feature flags that control signals functionality
export const featureFlags = {
  communitySignals: true, // Always enabled in community edition
  signalsOnboarding: true,
  signalsAutomations: true,
  signalsIntegrations: true
};

// Export the complete module configuration
export default {
  ...signalsModule,
  info: moduleInfo,
  structure: moduleStructure,
  features: featureFlags
};