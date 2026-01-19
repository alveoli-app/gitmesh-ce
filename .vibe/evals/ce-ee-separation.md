# CE/EE Separation Evaluation

## Purpose

This evaluation validates that AI-generated code maintains strict separation between Community Edition (CE) and Enterprise Edition (EE) codebases, preventing proprietary code from entering the open-source repository.

## Validation Criteria

1. **No EE Code References**: Code does not import, reference, or depend on EE modules
2. **No EE Features**: Code does not implement features exclusive to EE
3. **License Compliance**: All code is Apache 2.0 compatible
4. **No Proprietary Dependencies**: Dependencies are open-source and license-compatible
5. **Clear Boundaries**: Extension points for EE are well-defined and documented
6. **No EE Configuration**: Configuration files do not reference EE-specific settings
7. **No EE Documentation**: Documentation does not describe EE-only features
8. **No EE Assets**: No proprietary assets, logos, or branding

## Pass/Fail Thresholds

### Pass Conditions
- Zero EE code references detected
- All dependencies are Apache 2.0 compatible
- Extension points properly documented
- No EE-specific configuration
- All code contributions are original or properly attributed

### Fail Conditions
- Any EE code references detected
- Proprietary dependencies included
- EE features implemented in CE codebase
- Missing license headers
- Unclear CE/EE boundaries

## Detection Patterns

### Code-Level Detection

**EE Import Patterns (FORBIDDEN):**
```typescript
// FORBIDDEN: Direct EE imports
import { EnterpriseFeature } from '@gitmesh/enterprise';
import { PremiumService } from '../ee/services';

// FORBIDDEN: Conditional EE imports
if (process.env.EDITION === 'enterprise') {
  const { EEModule } = require('@gitmesh/enterprise');
}

// FORBIDDEN: Dynamic EE imports
const eeModule = await import('@gitmesh/enterprise');
```

**Allowed Extension Patterns:**
```typescript
// ALLOWED: Plugin/hook system for EE extensions
interface FeaturePlugin {
  name: string;
  initialize(): void;
  execute(context: Context): Promise<Result>;
}

class FeatureRegistry {
  private plugins: Map<string, FeaturePlugin> = new Map();
  
  register(plugin: FeaturePlugin) {
    this.plugins.set(plugin.name, plugin);
  }
  
  async execute(name: string, context: Context): Promise<Result> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Feature ${name} not available`);
    }
    return plugin.execute(context);
  }
}

// EE can register plugins without CE knowing implementation details
```

### Configuration Detection

**FORBIDDEN Configuration:**
```json
{
  "features": {
    "enterpriseAnalytics": true,
    "advancedReporting": true
  },
  "license": {
    "type": "enterprise",
    "key": "EE-LICENSE-KEY"
  }
}
```

**ALLOWED Configuration:**
```json
{
  "features": {
    "analytics": true,
    "reporting": true
  },
  "plugins": {
    "enabled": true,
    "directory": "./plugins"
  }
}
```

### Documentation Detection

**FORBIDDEN Documentation:**
```markdown
## Enterprise Features

GitMesh Enterprise Edition includes:
- Advanced analytics dashboard
- Custom integrations
- Priority support
```

**ALLOWED Documentation:**
```markdown
## Plugin System

GitMesh supports plugins for extending functionality.
See [Plugin Development Guide](./plugins.md) for details.

Note: Some features may require additional plugins or extensions.
```

### Dependency Detection

**Check package.json for proprietary dependencies:**
```bash
# FORBIDDEN: Proprietary packages
{
  "dependencies": {
    "@gitmesh/enterprise": "^1.0.0",
    "proprietary-analytics": "^2.0.0"
  }
}

# ALLOWED: Open-source packages
{
  "dependencies": {
    "express": "^4.18.0",
    "sequelize": "^6.32.0"
  }
}
```

## Remediation Guidance

### Removing EE References

**Step 1: Identify EE Code**
```bash
# Search for EE imports
grep -r "from '@gitmesh/enterprise'" .
grep -r "from '../ee/" .
grep -r "require('@gitmesh/enterprise')" .

# Search for EE feature flags
grep -r "ENTERPRISE" .
grep -r "EE_ONLY" .
grep -r "PREMIUM" .
```

**Step 2: Remove or Replace**
```typescript
// BEFORE: EE-dependent code
import { AdvancedAnalytics } from '@gitmesh/enterprise';

async function generateReport() {
  const analytics = new AdvancedAnalytics();
  return analytics.generateAdvancedReport();
}

// AFTER: Plugin-based approach
interface AnalyticsPlugin {
  generateReport(): Promise<Report>;
}

class AnalyticsService {
  private plugin?: AnalyticsPlugin;
  
  registerPlugin(plugin: AnalyticsPlugin) {
    this.plugin = plugin;
  }
  
  async generateReport(): Promise<Report> {
    if (!this.plugin) {
      return this.generateBasicReport();
    }
    return this.plugin.generateReport();
  }
  
  private async generateBasicReport(): Promise<Report> {
    // CE implementation
  }
}
```

**Step 3: Verify Removal**
```bash
# Ensure no EE references remain
git diff HEAD

# Run detection script
./scripts/check-ee-separation.sh
```

### Implementing Extension Points

**Plugin Interface Pattern:**
```typescript
// core/plugins/types.ts
export interface Plugin {
  name: string;
  version: string;
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}

export interface PluginContext {
  config: Config;
  logger: Logger;
  database: Database;
}

// core/plugins/registry.ts
export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  
  async load(pluginPath: string): Promise<void> {
    const plugin = await import(pluginPath);
    await plugin.initialize(this.context);
    this.plugins.set(plugin.name, plugin);
  }
  
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
}
```

**Hook System Pattern:**
```typescript
// core/hooks/types.ts
export type HookCallback<T> = (data: T) => Promise<T>;

export class HookManager {
  private hooks: Map<string, HookCallback<any>[]> = new Map();
  
  register<T>(event: string, callback: HookCallback<T>): void {
    const callbacks = this.hooks.get(event) || [];
    callbacks.push(callback);
    this.hooks.set(event, callbacks);
  }
  
  async execute<T>(event: string, data: T): Promise<T> {
    const callbacks = this.hooks.get(event) || [];
    let result = data;
    
    for (const callback of callbacks) {
      result = await callback(result);
    }
    
    return result;
  }
}

// Usage in CE
const hooks = new HookManager();

// EE can register hooks without CE knowing implementation
hooks.register('user.created', async (user) => {
  // EE-specific logic
  return user;
});

// CE executes hooks
const user = await createUser(data);
const enhancedUser = await hooks.execute('user.created', user);
```

## Automation

### Pre-Commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Checking for EE code references..."

# Check for EE imports
if git diff --cached | grep -E "(from '@gitmesh/enterprise'|from '../ee/|require\('@gitmesh/enterprise'\))"; then
  echo "ERROR: EE code references detected!"
  echo "CE codebase must not reference EE code."
  exit 1
fi

# Check for EE feature flags
if git diff --cached | grep -E "(ENTERPRISE|EE_ONLY|PREMIUM_FEATURE)"; then
  echo "WARNING: Potential EE feature flag detected."
  echo "Please verify this is not EE-specific code."
fi

# Check license headers
if ! ./scripts/check-license-headers.sh; then
  echo "ERROR: Missing or incorrect license headers."
  exit 1
fi

echo "CE/EE separation check passed."
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Check CE/EE Separation
  run: |
    # Check for EE imports
    if grep -r "from '@gitmesh/enterprise'" .; then
      echo "ERROR: EE imports detected in CE codebase"
      exit 1
    fi
    
    # Check for EE directories
    if [ -d "ee" ] || [ -d "enterprise" ]; then
      echo "ERROR: EE directories detected in CE codebase"
      exit 1
    fi
    
    # Verify license headers
    ./scripts/check-license-headers.sh

- name: Check Dependencies
  run: |
    # Verify all dependencies are open-source
    ./scripts/check-dependency-licenses.sh
    
- name: License Compliance
  uses: fossas/fossa-action@v1
  with:
    api-key: ${{ secrets.FOSSA_API_KEY }}
```

### Automated Detection Script
```bash
#!/bin/bash
# scripts/check-ee-separation.sh

set -e

echo "Checking CE/EE separation..."

# Check for EE imports
echo "Checking for EE imports..."
if grep -r "from '@gitmesh/enterprise'" backend/ frontend/ services/; then
  echo "❌ FAIL: EE imports detected"
  exit 1
fi

# Check for EE directories
echo "Checking for EE directories..."
if [ -d "backend/ee" ] || [ -d "frontend/ee" ] || [ -d "services/ee" ]; then
  echo "❌ FAIL: EE directories detected"
  exit 1
fi

# Check for EE configuration
echo "Checking for EE configuration..."
if grep -r "enterprise" backend/config/ frontend/config/ services/config/; then
  echo "⚠️  WARNING: Potential EE configuration detected"
fi

# Check license headers
echo "Checking license headers..."
./scripts/check-license-headers.sh

echo "✅ PASS: CE/EE separation verified"
```

## License Header Template

All CE files must include Apache 2.0 license header:

```typescript
/**
 * Copyright (c) 2025 GitMesh Community
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

## Reporting Violations

If you detect CE/EE boundary violations:

1. **STOP immediately** - Do not proceed with the change
2. **Document the violation** - Note what was detected and where
3. **Report to maintainers** - Email: opensource@gitmesh.com
4. **Remove the violation** - Delete or replace EE code
5. **Verify clean state** - Run detection scripts

## CE/EE Separation Checklist

Before submitting PR, verify:

- [ ] No imports from `@gitmesh/enterprise` or EE directories
- [ ] No EE-specific feature flags or configuration
- [ ] All dependencies are Apache 2.0 compatible
- [ ] License headers present on all new files
- [ ] Extension points documented if adding plugin hooks
- [ ] No EE features implemented in CE codebase
- [ ] No proprietary assets or branding
- [ ] Detection scripts pass without errors

## Common Violations

### Direct EE Dependencies
```typescript
// VIOLATION
import { EnterpriseAuth } from '@gitmesh/enterprise';
```

### Conditional EE Code
```typescript
// VIOLATION
if (isEnterpriseEdition()) {
  // EE-specific logic
}
```

### EE Feature Flags
```typescript
// VIOLATION
const features = {
  ENTERPRISE_ANALYTICS: true,
  PREMIUM_SUPPORT: true
};
```

### Proprietary Dependencies
```json
// VIOLATION
{
  "dependencies": {
    "proprietary-package": "^1.0.0"
  }
}
```

## Allowed Patterns

### Plugin System
```typescript
// ALLOWED: Plugin registration
pluginRegistry.register(analyticsPlugin);
```

### Hook System
```typescript
// ALLOWED: Hook execution
await hooks.execute('user.created', user);
```

### Feature Detection
```typescript
// ALLOWED: Check if plugin is available
if (pluginRegistry.has('advanced-analytics')) {
  // Use plugin
}
```

## Related Evaluations
- **code-quality.md**: Ensures clean code boundaries
- **security-scan.md**: Validates license compliance
- **test-coverage.md**: Tests CE functionality independently
