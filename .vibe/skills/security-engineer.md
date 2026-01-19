# Security Engineer

## Role Description
Security engineer specializing in application security, vulnerability assessment, and secure coding practices for GitMesh CE. Focuses on identifying and mitigating security risks, implementing security controls, and ensuring compliance with security standards.

## Responsibilities
- Conduct security audits and code reviews
- Identify and remediate security vulnerabilities
- Implement authentication and authorization mechanisms
- Ensure secure data handling and encryption
- Configure security headers and CORS policies
- Perform penetration testing and threat modeling
- Monitor for security incidents and respond to threats
- Document security policies and procedures

## Tools and Technologies
- **OWASP Top 10**: Common web application vulnerabilities
- **JWT**: Token-based authentication
- **bcrypt**: Password hashing
- **Helmet.js**: Security headers for Express
- **CORS**: Cross-origin resource sharing configuration
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Input sanitization and output encoding
- **CSRF Protection**: Token-based protection
- **TLS/SSL**: Encrypted communication
- **Security Scanners**: npm audit, Snyk, OWASP ZAP

## Best Practices

1. **Authentication & Authorization**
   - Use strong password hashing (bcrypt, argon2)
   - Implement multi-factor authentication (MFA)
   - Use JWT with short expiration times
   - Implement proper session management
   - Follow principle of least privilege
   - Use role-based access control (RBAC)

2. **Input Validation**
   - Validate all user input on server side
   - Use allowlists, not denylists
   - Sanitize input before processing
   - Validate data types and formats
   - Implement rate limiting
   - Reject unexpected input

3. **Output Encoding**
   - Encode output based on context (HTML, JS, URL)
   - Use templating engines with auto-escaping
   - Set proper Content-Type headers
   - Implement Content Security Policy (CSP)
   - Avoid innerHTML with user data
   - Use textContent instead of innerHTML

4. **Data Protection**
   - Encrypt sensitive data at rest
   - Use TLS for data in transit
   - Never log sensitive information
   - Implement secure key management
   - Use environment variables for secrets
   - Regularly rotate credentials

5. **SQL Injection Prevention**
   - Always use parameterized queries
   - Never concatenate user input into SQL
   - Use ORM with proper escaping
   - Implement least privilege for database users
   - Validate and sanitize all inputs
   - Use prepared statements

6. **API Security**
   - Implement rate limiting
   - Use API keys or OAuth for authentication
   - Validate all request parameters
   - Implement proper CORS policies
   - Use HTTPS for all endpoints
   - Log and monitor API usage

7. **Security Headers**
   - Set X-Frame-Options to prevent clickjacking
   - Set X-Content-Type-Options to prevent MIME sniffing
   - Set X-XSS-Protection for XSS filtering
   - Implement Content Security Policy (CSP)
   - Set Strict-Transport-Security (HSTS)
   - Remove X-Powered-By header

## Evaluation Criteria
- **Vulnerability Assessment**: No critical or high vulnerabilities
- **Authentication**: Strong password hashing, secure session management
- **Input Validation**: All inputs validated and sanitized
- **Output Encoding**: Proper encoding based on context
- **Data Protection**: Sensitive data encrypted, no secrets in code
- **Security Headers**: All recommended headers implemented
- **Compliance**: Follows OWASP guidelines and security standards

## Common Patterns

### Secure Authentication
```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRATION = '1h';

export class AuthService {
  /**
   * Hash password securely using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    // Validate password strength
    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters');
    }
    
    return bcrypt.hash(password, SALT_ROUNDS);
  }
  
  /**
   * Verify password against hash
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  /**
   * Generate JWT token
   */
  static generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
  }
  
  /**
   * Verify JWT token
   */
  static verifyToken(token: string): { userId: string; email: string } {
    try {
      return jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

// Middleware for protected routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const payload = AuthService.verifyToken(token);
    req.currentUser = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Input Validation
```typescript
import validator from 'validator';

export class InputValidator {
  /**
   * Validate and sanitize email
   */
  static validateEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }
    
    const sanitized = validator.trim(email.toLowerCase());
    
    if (!validator.isEmail(sanitized)) {
      throw new ValidationError('Invalid email format');
    }
    
    return sanitized;
  }
  
  /**
   * Validate and sanitize username
   */
  static validateUsername(username: string): string {
    if (!username || typeof username !== 'string') {
      throw new ValidationError('Username is required');
    }
    
    const sanitized = validator.trim(username);
    
    // Only allow alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(sanitized)) {
      throw new ValidationError(
        'Username must be 3-30 characters and contain only letters, numbers, and underscores'
      );
    }
    
    return sanitized;
  }
  
  /**
   * Validate URL
   */
  static validateUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required');
    }
    
    const sanitized = validator.trim(url);
    
    if (!validator.isURL(sanitized, { protocols: ['http', 'https'] })) {
      throw new ValidationError('Invalid URL format');
    }
    
    return sanitized;
  }
  
  /**
   * Sanitize HTML to prevent XSS
   */
  static sanitizeHtml(html: string): string {
    // Use a library like DOMPurify or sanitize-html
    // This is a simplified example
    return validator.escape(html);
  }
}
```

### SQL Injection Prevention
```typescript
import { QueryTypes } from 'sequelize';

export class MemberRepository {
  /**
   * Safe query using parameterized statements
   */
  static async findByEmail(email: string): Promise<Member | null> {
    // Good: Parameterized query
    const [member] = await sequelize.query(
      'SELECT * FROM members WHERE email = :email',
      {
        replacements: { email },
        type: QueryTypes.SELECT,
      }
    );
    
    return member || null;
  }
  
  /**
   * Safe query using ORM
   */
  static async search(query: string): Promise<Member[]> {
    // Good: ORM handles escaping
    return Member.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${query}%` } },
          { lastName: { [Op.iLike]: `%${query}%` } },
        ],
      },
    });
  }
}

// ❌ NEVER DO THIS
export class UnsafeMemberRepository {
  static async findByEmail(email: string): Promise<Member | null> {
    // Bad: SQL injection vulnerability
    const [member] = await sequelize.query(
      `SELECT * FROM members WHERE email = '${email}'`
    );
    return member || null;
  }
}
```

### Security Headers with Helmet
```typescript
import helmet from 'helmet';
import express from 'express';

const app = express();

// Apply security headers
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  
  // Strict Transport Security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
}));

// Remove X-Powered-By header
app.disable('x-powered-by');
```

### CORS Configuration
```typescript
import cors from 'cors';

const corsOptions = {
  // Allowlist of origins
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = [
      'https://gitmesh.dev',
      'https://app.gitmesh.dev',
    ];
    
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  
  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization'],
  
  // Expose headers
  exposedHeaders: ['X-Total-Count'],
  
  // Allow credentials
  credentials: true,
  
  // Preflight cache duration
  maxAge: 86400,
};

app.use(cors(corsOptions));
```

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// General rate limiter
const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:general:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 attempts per window
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Apply rate limiters
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
```

### Secure File Upload
```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/uploads');
  },
  filename: (req, file, cb) => {
    // Generate random filename to prevent path traversal
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${randomName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    
    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
    
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Invalid file extension'));
    }
    
    cb(null, true);
  },
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Additional validation: check actual file content
  // Use a library like file-type to verify MIME type
  
  res.json({ filename: req.file.filename });
});
```

## Anti-Patterns

### ❌ Avoid: Weak Password Hashing
```typescript
// Bad: MD5 or SHA1 (broken)
import crypto from 'crypto';
const hash = crypto.createHash('md5').update(password).digest('hex');

// Bad: Plain bcrypt without salt rounds
const hash = bcrypt.hashSync(password, 1);

// Good: bcrypt with proper salt rounds
const hash = await bcrypt.hash(password, 12);
```

### ❌ Avoid: SQL Injection
```typescript
// Bad: String concatenation
const query = `SELECT * FROM users WHERE email = '${email}'`;

// Good: Parameterized query
const query = 'SELECT * FROM users WHERE email = ?';
const [user] = await db.query(query, [email]);
```

### ❌ Avoid: Storing Secrets in Code
```typescript
// Bad: Hardcoded secrets
const JWT_SECRET = 'mysecretkey123';
const API_KEY = 'sk_live_abc123';

// Good: Environment variables
const JWT_SECRET = process.env.JWT_SECRET!;
const API_KEY = process.env.API_KEY!;
```

### ❌ Avoid: Missing Input Validation
```typescript
// Bad: No validation
app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body);
  res.json(user);
});

// Good: Validate input
app.post('/api/users', async (req, res) => {
  const email = InputValidator.validateEmail(req.body.email);
  const username = InputValidator.validateUsername(req.body.username);
  
  const user = await User.create({ email, username });
  res.json(user);
});
```

### ❌ Avoid: Exposing Error Details
```typescript
// Bad: Exposes stack trace
try {
  await dangerousOperation();
} catch (error) {
  res.status(500).json({ error: error.message, stack: error.stack });
}

// Good: Generic error message
try {
  await dangerousOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  res.status(500).json({ error: 'Internal server error' });
}
```

### ❌ Avoid: Open CORS Policy
```typescript
// Bad: Allow all origins
app.use(cors({ origin: '*' }));

// Good: Allowlist specific origins
app.use(cors({
  origin: ['https://gitmesh.dev', 'https://app.gitmesh.dev'],
}));
```
