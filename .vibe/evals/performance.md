# Performance Evaluation

## Purpose

This evaluation validates that AI-generated code meets GitMesh CE performance requirements and does not introduce performance regressions.

## Validation Criteria

1. **API Response Time**: Endpoints respond within acceptable latency thresholds
2. **Database Query Efficiency**: Queries are optimized, no N+1 problems
3. **Memory Usage**: No memory leaks, reasonable memory consumption
4. **CPU Utilization**: Efficient algorithms, no unnecessary computation
5. **Bundle Size**: Frontend bundles stay within size limits
6. **Render Performance**: UI renders smoothly without blocking
7. **Caching Strategy**: Appropriate use of caching mechanisms
8. **Async Operations**: Non-blocking I/O, proper use of async/await

## Pass/Fail Thresholds

### Backend API Performance
- **Pass**: 
  - P50 response time < 200ms
  - P95 response time < 500ms
  - P99 response time < 1000ms
  - Database queries < 50ms average
  - No N+1 query patterns

- **Fail**:
  - P50 response time > 500ms
  - P95 response time > 2000ms
  - Database queries > 200ms average
  - N+1 query patterns detected

### Frontend Performance
- **Pass**:
  - First Contentful Paint (FCP) < 1.5s
  - Largest Contentful Paint (LCP) < 2.5s
  - Time to Interactive (TTI) < 3.5s
  - Bundle size < 500KB (gzipped)
  - Component render time < 16ms

- **Fail**:
  - FCP > 3s
  - LCP > 4s
  - TTI > 5s
  - Bundle size > 1MB (gzipped)
  - Component render time > 50ms

### Services (Python Workers)
- **Pass**:
  - Task processing time < 5s average
  - Memory usage < 512MB per worker
  - CPU usage < 80% average
  - No memory leaks over 24h

- **Fail**:
  - Task processing time > 30s average
  - Memory usage > 1GB per worker
  - CPU usage > 95% sustained
  - Memory leaks detected

## Remediation Guidance

### API Performance Optimization

**Identify Slow Endpoints:**
```bash
# Enable request logging
cd backend
NODE_ENV=development pnpm start

# Analyze logs for slow requests
grep "Request took" logs/app.log | sort -t: -k2 -n
```

**Database Query Optimization:**
```typescript
// BAD: N+1 query problem
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
}

// GOOD: Eager loading
const users = await User.findAll({
  include: [{ model: Post, as: 'posts' }]
});

// GOOD: Batch loading with DataLoader
const userLoader = new DataLoader(async (userIds) => {
  const users = await User.findAll({ where: { id: userIds } });
  return userIds.map(id => users.find(u => u.id === id));
});
```

**Add Database Indexes:**
```sql
-- Identify missing indexes
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- Add index if needed
CREATE INDEX idx_users_email ON users(email);
```

**Implement Caching:**
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedUser(userId: string) {
  // Check cache first
  const cached = await redis.get(`user:${userId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const user = await User.findByPk(userId);
  
  // Cache for 5 minutes
  await redis.setex(`user:${userId}`, 300, JSON.stringify(user));
  
  return user;
}
```

### Frontend Performance Optimization

**Measure Performance:**
```bash
# Lighthouse audit
cd frontend
pnpm run build
npx lighthouse http://localhost:3000 --view

# Bundle analysis
pnpm run build --analyze
```

**Code Splitting:**
```typescript
// BAD: Import everything upfront
import { HeavyComponent } from './HeavyComponent';

// GOOD: Lazy load heavy components
const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.vue')
);
```

**Optimize Bundle Size:**
```typescript
// BAD: Import entire library
import _ from 'lodash';

// GOOD: Import only what you need
import debounce from 'lodash/debounce';

// GOOD: Use tree-shakeable alternatives
import { debounce } from 'lodash-es';
```

**Optimize Rendering:**
```vue
<script setup>
import { computed, ref } from 'vue';

// BAD: Expensive computation in template
const items = ref([...]);
</script>

<template>
  <div v-for="item in items.filter(i => i.active).map(i => i.name)">
    {{ item }}
  </div>
</template>

<!-- GOOD: Use computed property -->
<script setup>
const items = ref([...]);
const activeItemNames = computed(() => 
  items.value.filter(i => i.active).map(i => i.name)
);
</script>

<template>
  <div v-for="name in activeItemNames" :key="name">
    {{ name }}
  </div>
</template>
```

**Virtual Scrolling for Large Lists:**
```vue
<script setup>
import { VirtualScroller } from 'vue-virtual-scroller';

const items = ref(Array.from({ length: 10000 }, (_, i) => ({ id: i })));
</script>

<template>
  <VirtualScroller :items="items" :item-height="50">
    <template #default="{ item }">
      <div>{{ item.id }}</div>
    </template>
  </VirtualScroller>
</template>
```

### Memory Leak Detection

**Node.js Memory Profiling:**
```bash
# Start with memory profiling
node --inspect backend/src/bin/www.js

# Open Chrome DevTools
# Navigate to chrome://inspect
# Take heap snapshots before and after operations
```

**Python Memory Profiling:**
```bash
# Install memory profiler
pip install memory-profiler

# Profile function
python -m memory_profiler services/apps/worker.py

# Or use decorator
from memory_profiler import profile

@profile
def process_task(task):
    # Function code
    pass
```

**Common Memory Leak Patterns:**
```typescript
// BAD: Event listener not removed
class Component {
  constructor() {
    window.addEventListener('resize', this.handleResize);
  }
}

// GOOD: Clean up event listeners
class Component {
  constructor() {
    window.addEventListener('resize', this.handleResize);
  }
  
  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}

// BAD: Circular references
const obj1 = { ref: null };
const obj2 = { ref: obj1 };
obj1.ref = obj2;

// GOOD: Break circular references
obj1.ref = null;
obj2.ref = null;
```

## Automation

### Performance Testing in CI/CD

```yaml
# GitHub Actions example
- name: Backend Performance Test
  run: |
    cd backend
    pnpm test:performance
    
- name: Frontend Lighthouse Audit
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      http://localhost:3000
    uploadArtifacts: true
    temporaryPublicStorage: true

- name: Bundle Size Check
  uses: andresz1/size-limit-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Load Testing

**Backend Load Test (k6):**
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
  },
};

export default function () {
  const res = http.get('http://localhost:8080/api/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

```bash
# Run load test
k6 run load-test.js
```

### Continuous Performance Monitoring

**Backend Monitoring:**
```typescript
import { performance } from 'perf_hooks';

function measurePerformance(fn: Function, name: string) {
  return async (...args: any[]) => {
    const start = performance.now();
    try {
      return await fn(...args);
    } finally {
      const duration = performance.now() - start;
      logger.info(`${name} took ${duration.toFixed(2)}ms`);
      
      // Alert if too slow
      if (duration > 1000) {
        logger.warn(`Slow operation detected: ${name}`);
      }
    }
  };
}

// Usage
const getUser = measurePerformance(
  async (id) => await User.findByPk(id),
  'getUser'
);
```

## Performance Profiling Tools

### Backend (Node.js)
- **Chrome DevTools**: Built-in profiler
- **Clinic.js**: Performance profiling suite
- **0x**: Flamegraph profiler
- **autocannon**: HTTP benchmarking tool

### Frontend
- **Chrome DevTools Performance**: Timeline and profiler
- **Lighthouse**: Automated audits
- **WebPageTest**: Real-world performance testing
- **Bundle Analyzer**: Webpack/Vite bundle analysis

### Services (Python)
- **cProfile**: Built-in profiler
- **py-spy**: Sampling profiler
- **memory_profiler**: Memory usage profiler
- **line_profiler**: Line-by-line profiler

## Performance Checklist

Before submitting PR, verify:

- [ ] API endpoints respond within latency thresholds
- [ ] No N+1 query patterns detected
- [ ] Database queries have appropriate indexes
- [ ] Caching implemented for frequently accessed data
- [ ] Frontend bundle size within limits
- [ ] Large lists use virtual scrolling
- [ ] Heavy components are lazy loaded
- [ ] No memory leaks detected
- [ ] Async operations are non-blocking
- [ ] Load test passes with expected throughput

## Common Performance Anti-Patterns

### Backend
- Synchronous file I/O in request handlers
- Missing database indexes on frequently queried columns
- N+1 query problems
- No connection pooling
- Blocking operations in event loop

### Frontend
- Large bundle sizes (importing entire libraries)
- Rendering large lists without virtualization
- Expensive computations in render functions
- Missing memoization for expensive operations
- Not using code splitting

### Services
- Processing large datasets in memory
- No batch processing for bulk operations
- Synchronous I/O in async workers
- Missing connection pooling
- Not using streaming for large files

## Performance Metrics to Track

### Backend
- Request latency (P50, P95, P99)
- Throughput (requests per second)
- Error rate
- Database query time
- Cache hit rate

### Frontend
- Core Web Vitals (LCP, FID, CLS)
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Time to Interactive (TTI)
- Bundle size

### Services
- Task processing time
- Queue depth
- Worker utilization
- Memory usage
- Error rate

## Related Evaluations
- **code-quality.md**: Ensures efficient code patterns
- **test-coverage.md**: Validates performance test coverage
- **security-scan.md**: Checks for security-related performance issues
