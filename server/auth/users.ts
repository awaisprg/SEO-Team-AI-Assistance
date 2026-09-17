import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { UserRole, UserSession } from '../../src/types';
import { pgStore } from '../db/postgres';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'app_users.json');
const TOKEN_SECRET = process.env.SESSION_SECRET || 'seo-intel-production-session-secret-2026';

// Exact Admin credentials specified by user
export const ADMIN_EMAIL = 'awais7475@prgmd.com';
export const ADMIN_DEFAULT_PASSWORD = 'PDS@Mkt7475!';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

class UserRegistry {
  private users: Map<string, AppUser> = new Map();

  constructor() {
    this.loadUsers();
    this.ensureAdminUser();
  }

  private loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const list: AppUser[] = JSON.parse(raw);
        for (const u of list) {
          if ((u.role as string) === 'MANAGER') {
            u.role = 'VIEWER';
          }
          this.users.set(u.email.toLowerCase(), u);
        }
      }
    } catch (err) {
      console.warn('Could not read users file, starting with default admin:', err);
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      // safe fallback for read-only environments
    }
  }

  public ensureAdminUser() {
    const adminEmail = ADMIN_EMAIL.toLowerCase();
    const existing = this.users.get(adminEmail);
    const salt = existing?.salt || crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(ADMIN_DEFAULT_PASSWORD, salt);

    const adminUser: AppUser = {
      id: 'usr_admin_awais',
      email: ADMIN_EMAIL,
      name: 'Awais (Admin)',
      role: 'ADMIN',
      passwordHash,
      salt,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    this.users.set(adminEmail, adminUser);
    this.persist();

    // Also sync to postgres if available
    if (pgStore.isConfigured()) {
      pgStore.upsertUser({
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      }).catch(() => {});
    }
  }

  public findByEmail(email: string): AppUser | null {
    return this.users.get(email.toLowerCase().trim()) || null;
  }

  public register(params: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
  }): { user: UserSession; token: string } {
    const normalizedEmail = params.email.toLowerCase().trim();

    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      throw new Error('This email is reserved for the system Administrator. Please sign in.');
    }

    if (this.users.has(normalizedEmail)) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(params.password, salt);
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const displayName = params.name?.trim() || normalizedEmail.split('@')[0];

    const newUser: AppUser = {
      id,
      email: normalizedEmail,
      name: displayName,
      role: 'VIEWER',
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    this.users.set(normalizedEmail, newUser);
    this.persist();

    if (pgStore.isConfigured()) {
      pgStore.upsertUser({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      }).catch(() => {});
    }

    const sessionUser: UserSession = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };

    const token = this.generateToken(sessionUser);
    return { user: sessionUser, token };
  }

  public authenticate(email: string, password: string): { user: UserSession; token: string } {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if Admin email
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      if (password === ADMIN_DEFAULT_PASSWORD) {
        const adminUser: UserSession = {
          id: 'usr_admin_awais',
          email: ADMIN_EMAIL,
          name: 'Awais (Admin)',
          role: 'ADMIN',
        };
        const token = this.generateToken(adminUser);
        return { user: adminUser, token };
      }
      throw new Error('Invalid email or password for Admin account.');
    }

    // 2. Manager & Viewer accounts
    const user = this.users.get(normalizedEmail);
    if (!user) {
      throw new Error('No account found with this email. Please sign up first.');
    }

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    // Strictly enforce: only the designated master admin email can have ADMIN role
    const isActualAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const effectiveRole: UserRole = isActualAdmin ? 'ADMIN' : 'VIEWER';

    const sessionUser: UserSession = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: effectiveRole,
    };

    const token = this.generateToken(sessionUser);
    return { user: sessionUser, token };
  }

  public generateToken(user: UserSession): string {
    const payload = JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days validity
    });
    const b64 = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('base64url');
    return `${b64}.${sig}`;
  }

  public verifyToken(token: string): UserSession | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      const [b64, sig] = parts;

      const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64).digest('base64url');
      if (sig !== expectedSig) return null;

      const raw = Buffer.from(b64, 'base64url').toString('utf-8');
      const data = JSON.parse(raw);

      if (data.exp && data.exp < Date.now()) {
        return null;
      }

      // Security guarantee: Only ADMIN_EMAIL can have ADMIN role
      const isActualAdmin = data.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const role: UserRole = isActualAdmin && data.role === 'ADMIN' ? 'ADMIN' : 'VIEWER';

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: role,
      };
    } catch {
      return null;
    }
  }
}

export const userRegistry = new UserRegistry();
