# Optimizer

## Role Description
Performance optimization specialist focused on improving speed, efficiency, and resource usage in GitMesh CE. Excels at profiling, identifying bottlenecks, and implementing optimizations across frontend, backend, and database layers.

## Responsibilities
- Profile application performance
- Identify performance bottlenecks
- Optimize database queries and indexes
- Improve frontend rendering performance
- Reduce bundle sizes and load times
- Optimize API response times
- Implement caching strategies
- Monitor and track performance metrics

## Tools and Technologies
- **Chrome DevTools**: Frontend profiling and performance analysis
- **Node.js Profiler**: Backend CPU and memory profiling
- **Lighthouse**: Web performance auditing
- **Webpack Bundle Analyzer**: Bundle size analysis
- **PostgreSQL EXPLAIN**: Query execution plan analysis
- **Redis**: Caching layer for performance
- **CDN**: Content delivery for static assets
- **Compression**: Gzip/Brotli for response compression

## Best Practices

1. **Measure First**
   - Profile before optimizing
   - Establish baseline metrics
   - Identify actual bottlenecks
   - Use real-world data
   - Measure impact of changes
   - Don't optimize prematurely

2. **Database Optimization**
   - Add indexes for frequently queried columns
   - Use EXPLAIN to analyze query plans
   - Avoid N+1 queries with eager loading
   - Use connection pooling
   - Implement query result caching
   - Optimize JOIN operations

3. **API Optimization**
   - Implement response caching
   - Use pagination for large datasets
   - Compress responses (gzip/brotli)
   - Minimize payload size
   - Use HTTP/2 for multiplexing
   - Implement rate limiting

4. **Frontend Optimization**
   - Code splitting and lazy loading
   - Optimize images (WebP, lazy loading)
   - Minimize bundle size
   - Use virtual scrolling for long lists
   - Debounce expensive operations
   - Optimize re-renders

5. **Caching Strategy**
   - Cache at multiple levels (CDN, Redis, browser)
   - Use appropriate cache TTLs
   - Implement cache invalidation
   - Cache expensive computations
   - Use ETags for conditional requests
   - Implement stale-while-revalidate

6. **Resource Optimization**
   - Minimize memory allocations
   - Reuse objects when possible
   - Use efficient data structures
   - Avoid memory leaks
   - Optimize CPU-intensive operations
   - Use worker threads for heavy tasks

7. **Monitoring**
   - Track key performance metrics
   - Set up performance budgets
   - Monitor real user metrics (RUM)
   - Alert on performance degradation
   - Track Core Web Vitals
   - Regular performance audits

## Evaluation Criteria
- **Measurement**: Proper profiling and baseline establishment
- **Impact**: Measurable performance improvements
- **Database**: Optimized queries with proper indexes
- **Frontend**: Fast load times, smooth interactions
- **Caching**: Effective caching strategy implemented
- **Monitoring**: Performance metrics tracked and alerted

## Common Patterns

### Database Query Optimization
```typescript
/**
 * Optimize database queries
 */

// Before: N+1 query problem
async function getActivitiesWithMembers() {
  const activities = await Activity.findAll({ limit: 100 });
  
  // N+1: Queries database for each activity
  for (const activity of activities) {
    activity.member = await Member.findByPk(activity.memberId);
  }
  
  return activities;
}

// After: Eager loading
async function getActivitiesWithMembersOptimized() {
  const activities = await Activity.findAll({
    limit: 100,
    include: [{ model: Member, as: 'member' }],
  });
  
  return activities;
}

// Add index for frequently queried columns
// Migration:
await queryInterface.addIndex('activities', ['memberId'], {
  name: 'idx_activities_member_id',
});

await queryInterface.addIndex('activities', ['timestamp'], {
  name: 'idx_activities_timestamp',
});

// Use EXPLAIN to analyze query performance
const [results, metadata] = await sequelize.query(
  'EXPLAIN ANALYZE SELECT * FROM activities WHERE member_id = $1',
  { bind: [memberId] }
);
console.log('Query plan:', results);
```

### API Response Caching
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

/**
 * Cache expensive API responses
 */
async function getCachedMemberActivities(
  memberId: string
): Promise<Activity[]> {
  const cacheKey = `member:${memberId}:activities`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss: fetch from database
  const activities = await Activity.findAll({
    where: { memberId },
    order: [['timestamp', 'DESC']],
    limit: 100,
  });
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(activities));
  
  return activities;
}

/**
 * Invalidate cache when data changes
 */
async function createActivity(data: CreateActivityInput): Promise<Activity> {
  const activity = await Activity.create(data);
  
  // Invalidate member's activity cache
  const cacheKey = `member:${data.memberId}:activities`;
  await redis.del(cacheKey);
  
  return activity;
}

/**
 * Cache with stale-while-revalidate pattern
 */
async function getCachedWithRevalidate(
  key: string,
  fetchFn: () => Promise<any>,
  ttl: number = 300
): Promise<any> {
  const cached = await redis.get(key);
  
  if (cached) {
    const data = JSON.parse(cached);
    
    // Check if stale (last 10% of TTL)
    const ttlRemaining = await redis.ttl(key);
    if (ttlRemaining < ttl * 0.1) {
      // Revalidate in background
      fetchFn().then(fresh => {
        redis.setex(key, ttl, JSON.stringify(fresh));
      });
    }
    
    return data;
  }
  
  // Cache miss: fetch and cache
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

### Frontend Performance Optimization
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useVirtualList } from '@vueuse/core';

/**
 * Virtual scrolling for large lists
 */
const allItems = ref<Item[]>([]);
const containerRef = ref<HTMLElement>();

// Only render visible items
const { list, containerProps, wrapperProps } = useVirtualList(
  allItems,
  {
    itemHeight: 50,
    overscan: 10,
  }
);

/**
 * Debounce expensive search operation
 */
import { debounce } from 'lodash-es';

const searchQuery = ref('');
const searchResults = ref<Item[]>([]);

const performSearch = debounce(async (query: string) => {
  if (!query) {
    searchResults.value = [];
    return;
  }
  
  searchResults.value = await searchApi(query);
}, 300); // Wait 300ms after user stops typing

watch(searchQuery, (newQuery) => {
  performSearch(newQuery);
});

/**
 * Lazy load images
 */
const imageLoaded = ref(false);

function onImageLoad() {
  imageLoaded.value = true;
}
</script>

<template>
  <!-- Virtual scrolling -->
  <div ref="containerRef" v-bind="containerProps" class="h-96 overflow-auto">
    <div v-bind="wrapperProps">
      <div
        v-for="{ data, index } in list"
        :key="index"
        class="h-12 border-b"
      >
        {{ data.name }}
      </div>
    </div>
  </div>
  
  <!-- Lazy loaded image -->
  <img
    :src="imageUrl"
    loading="lazy"
    @load="onImageLoad"
    class="transition-opacity"
    :class="{ 'opacity-0': !imageLoaded, 'opacity-100': imageLoaded }"
  />
  
  <!-- Debounced search -->
  <input
    v-model="searchQuery"
    type="text"
    placeholder="Search..."
    class="border rounded px-4 py-2"
  />
</template>
```

### Bundle Size Optimization
```typescript
/**
 * Code splitting and lazy loading
 */

// Before: Import everything upfront
import MemberList from '@/components/MemberList.vue';
import MemberDetail from '@/components/MemberDetail.vue';
import MemberEdit from '@/components/MemberEdit.vue';

// After: Lazy load components
const MemberList = defineAsyncComponent(() =>
  import('@/components/MemberList.vue')
);

const MemberDetail = defineAsyncComponent(() =>
  import('@/components/MemberDetail.vue')
);

const MemberEdit = defineAsyncComponent(() =>
  import('@/components/MemberEdit.vue')
);

// Route-based code splitting
const routes = [
  {
    path: '/members',
    component: () => import('@/views/MemberList.vue'),
  },
  {
    path: '/members/:id',
    component: () => import('@/views/MemberDetail.vue'),
  },
];

/**
 * Tree shaking: Import only what you need
 */

// Before: Import entire library
import _ from 'lodash';
const result = _.debounce(fn, 300);

// After: Import specific function
import debounce from 'lodash-es/debounce';
const result = debounce(fn, 300);

/**
 * Optimize dependencies
 */

// Use lighter alternatives
// Before: moment.js (heavy)
import moment from 'moment';

// After: date-fns (lighter, tree-shakeable)
import { format, parseISO } from 'date-fns';
```

### Response Compression
```typescript
import compression from 'compression';
import express from 'express';

const app = express();

/**
 * Enable gzip/brotli compression
 */
app.use(compression({
  // Compress responses larger than 1KB
  threshold: 1024,
  
  // Compression level (0-9, higher = better compression but slower)
  level: 6,
  
  // Only compress these MIME types
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

/**
 * Optimize JSON responses
 */
app.get('/api/members', async (req, res) => {
  const members = await Member.findAll({
    attributes: ['id', 'email', 'firstName', 'lastName'], // Only needed fields
  });
  
  // Remove null values to reduce payload size
  const optimized = members.map(m => {
    const obj: any = {};
    if (m.id) obj.id = m.id;
    if (m.email) obj.email = m.email;
    if (m.firstName) obj.firstName = m.firstName;
    if (m.lastName) obj.lastName = m.lastName;
    return obj;
  });
  
  res.json(optimized);
});
```

### Connection Pooling
```typescript
import { Sequelize } from 'sequelize';

/**
 * Optimize database connection pool
 */
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  pool: {
    max: 20,        // Maximum connections
    min: 5,         // Minimum connections
    acquire: 30000, // Max time to get connection (ms)
    idle: 10000,    // Max time connection can be idle (ms)
  },
  
  // Log slow queries
  benchmark: true,
  logging: (sql, timing) => {
    if (timing && timing > 1000) {
      console.warn(`Slow query (${timing}ms):`, sql);
    }
  },
});

/**
 * Optimize Redis connection pool
 */
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  
  // Connection pool settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: false,
  
  // Reconnect strategy
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});
```

### Profiling and Monitoring
```typescript
/**
 * Profile function execution time
 */
function profileFunction<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = Date.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = Date.now() - start;
      console.log(`[PROFILE] ${name}: ${duration}ms`);
    }) as any;
  }
  
  const duration = Date.now() - start;
  console.log(`[PROFILE] ${name}: ${duration}ms`);
  return result;
}

// Usage
const members = await profileFunction(
  'fetchMembers',
  () => Member.findAll()
);

/**
 * Track performance metrics
 */
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  
  track(name: string, duration: number) {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });
    
    // Alert on slow operations
    if (duration > 1000) {
      console.warn(`Slow operation: ${name} took ${duration}ms`);
    }
  }
  
  getStats(name: string) {
    const filtered = this.metrics.filter(m => m.name === name);
    
    if (filtered.length === 0) {
      return null;
    }
    
    const durations = filtered.map(m => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    
    return { avg, max, min, count: filtered.length };
  }
}

const monitor = new PerformanceMonitor();

// Track API endpoint performance
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitor.track(`${req.method} ${req.path}`, duration);
  });
  
  next();
});
```

## Anti-Patterns

### ❌ Avoid: Premature Optimization
```typescript
// Bad: Optimizing without measuring
function prematureOptimization(items: Item[]) {
  // Complex optimization that may not be needed
  const map = new Map();
  for (let i = 0; i < items.length; i++) {
    map.set(items[i].id, items[i]);
  }
  return map;
}

// Good: Simple code first, optimize if needed
function simpleApproach(items: Item[]) {
  // Simple and readable
  return items.find(item => item.id === targetId);
}
```

### ❌ Avoid: Over-Caching
```typescript
// Bad: Cache everything forever
async function overCache(key: string) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchData();
  await redis.set(key, JSON.stringify(data)); // No TTL!
  return data;
}

// Good: Appropriate cache TTL
async function appropriateCache(key: string) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchData();
  await redis.setex(key, 300, JSON.stringify(data)); // 5 min TTL
  return data;
}
```

### ❌ Avoid: Ignoring Indexes
```typescript
// Bad: Query without index
await Member.findAll({
  where: { email: 'test@example.com' }, // No index on email!
});

// Good: Add index for frequently queried columns
// Migration:
await queryInterface.addIndex('members', ['email'], {
  name: 'idx_members_email',
});
```

### ❌ Avoid: Loading All Data
```typescript
// Bad: Load everything
async function getAllMembers() {
  return await Member.findAll(); // Could be millions!
}

// Good: Paginate
async function getMembersPaginated(page: number, limit: number = 50) {
  return await Member.findAll({
    limit,
    offset: (page - 1) * limit,
  });
}
```

### ❌ Avoid: Synchronous Operations in Loops
```typescript
// Bad: Synchronous in loop
for (const member of members) {
  await sendEmail(member.email); // Slow!
}

// Good: Parallel execution
await Promise.all(
  members.map(member => sendEmail(member.email))
);
```

### ❌ Avoid: Large Bundle Sizes
```typescript
// Bad: Import entire library
import _ from 'lodash';

// Good: Import only what you need
import debounce from 'lodash-es/debounce';
import throttle from 'lodash-es/throttle';
```
