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

// Resilient persistent storage directory resolution
// Handles Render.com Persistent Disks (/var/data, /data, or DATA_DIR)
function resolveStorageDir(): string {
  const envPath = process.env.DATA_DIR || process.env.RENDER_DISK_PATH || process.env.PERSISTENT_DATA_PATH;
  if (envPath) {
    try {
      if (!fs.existsSync(envPath)) {
        fs.mkdirSync(envPath, { recursive: true });
      }
      return envPath;
    } catch (err) {
      console.warn(`Could not create directory at ${envPath}, falling back:`, err);
    }
  }

  // Check common mounted disk paths on Render / Cloud platforms
  if (fs.existsSync('/var/data')) {
    return '/var/data';
  }
  if (fs.existsSync('/data')) {
    return '/data';
  }

  // Fallback to project root .data
  const localData = path.join(process.cwd(), '.data');
  if (!fs.existsSync(localData)) {
    try {
      fs.mkdirSync(localData, { recursive: true });
    } catch {}
  }
  return localData;
}

const STORAGE_DIR = resolveStorageDir();
const USERS_FILE = path.join(STORAGE_DIR, 'app_users.json');
const TOKEN_SECRET = process.env.SESSION_SECRET || 'seo-intel-production-session-secret-2026';

// Exact Admin credentials specified by user
export const ADMIN_EMAIL = 'awais7475@prgmd.com';
export const ADMIN_DEFAULT_PASSWORD = 'PDS@Mkt7475!';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

class UserRegistry {
  private users: Map<string, AppUser> = new Map();
  private isPostgresInitialized = false;

  constructor() {
    this.loadFromFilesystem();
    this.ensureAdminUser();
    // Asynchronously initialize PostgreSQL sync if available
    this.initPostgresSync().catch((err) => {
      console.warn('PostgreSQL user sync warning:', err.message);
    });
  }

  private loadFromFilesystem() {
    try {
      // If primary storage file doesn't exist yet, check project .data fallback
      if (!fs.existsSync(USERS_FILE)) {
        const repoFallback = path.join(process.cwd(), '.data', 'app_users.json');
        if (fs.existsSync(repoFallback) && repoFallback !== USERS_FILE) {
          try {
            const initialData = fs.readFileSync(repoFallback, 'utf-8');
            fs.writeFileSync(USERS_FILE, initialData, 'utf-8');
          } catch {}
        }
      }

      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        const list: AppUser[] = JSON.parse(raw);
        for (const u of list) {
          if ((u.role as string) === 'VIEWER') {
            u.role = 'MANAGER';
          }
          this.users.set(u.email.toLowerCase().trim(), u);
        }
      }
    } catch (err) {
      console.warn('Could not read users file, starting with default admin:', err);
    }
  }

  public async initPostgresSync(): Promise<void> {
    if (!pgStore.isConfigured()) return;

    try {
      await pgStore.initSchema();
      this.isPostgresInitialized = true;

      // 1. Load users stored in PostgreSQL
      const dbUsers = await pgStore.getAllAppUsers();
      let importedFromDb = 0;

      for (const dbu of dbUsers) {
        const email = dbu.email.toLowerCase().trim();
        const role: UserRole = dbu.role === 'ADMIN' ? 'ADMIN' : 'MANAGER';
        if (!this.users.has(email)) {
          this.users.set(email, {
            id: dbu.id,
            email,
            name: dbu.name,
            role,
            passwordHash: dbu.passwordHash,
            salt: dbu.salt,
            createdAt: dbu.createdAt,
          });
          importedFromDb++;
        }
      }

      if (importedFromDb > 0) {
        console.log(`Synced ${importedFromDb} user account(s) from persistent PostgreSQL database.`);
        this.persist();
      }

      // 2. Ensure all current in-memory users (including created ones) are safely in PostgreSQL
      for (const u of this.users.values()) {
        await pgStore.upsertAppUser({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash: u.passwordHash,
          salt: u.salt,
          createdAt: u.createdAt,
        });
      }
    } catch (err: any) {
      console.warn('Error during PostgreSQL user sync:', err.message);
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
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

    if (pgStore.isConfigured()) {
      pgStore
        .upsertAppUser({
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          passwordHash: adminUser.passwordHash,
          salt: adminUser.salt,
          createdAt: adminUser.createdAt,
        })
        .catch(() => {});
    }
  }

  public findByEmail(email: string): AppUser | null {
    return this.users.get(email.toLowerCase().trim()) || null;
  }

  public getAllUsers(): { id: string; email: string; name: string; role: UserRole; createdAt: string }[] {
    return Array.from(this.users.values()).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  // Full backup manifest for admin restore & export
  public getBackupManifest(): AppUser[] {
    return Array.from(this.users.values());
  }

  public createUser(params: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
  }): { id: string; email: string; name: string; role: UserRole; createdAt: string } {
    const normalizedEmail = params.email.toLowerCase().trim();

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('A valid email address is required.');
    }

    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      throw new Error('The primary administrator account already exists.');
    }

    if (this.users.has(normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(params.password, salt);
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const displayName = params.name?.trim() || normalizedEmail.split('@')[0];
    const role: UserRole = params.role === 'ADMIN' ? 'ADMIN' : 'MANAGER';

    const newUser: AppUser = {
      id,
      email: normalizedEmail,
      name: displayName,
      role,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    this.users.set(normalizedEmail, newUser);
    this.persist();

    // Persist to PostgreSQL if configured
    if (pgStore.isConfigured()) {
      pgStore
        .upsertAppUser({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          passwordHash: newUser.passwordHash,
          salt: newUser.salt,
          createdAt: newUser.createdAt,
        })
        .catch((err) => {
          console.error('Failed to sync new user to PostgreSQL:', err);
        });
    }

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };
  }

  public deleteUser(userId: string): boolean {
    let targetEmail: string | null = null;
    for (const [email, u] of this.users.entries()) {
      if (u.id === userId) {
        if (email === ADMIN_EMAIL.toLowerCase() || u.id === 'usr_admin_awais') {
          throw new Error('The primary administrator account cannot be deleted.');
        }
        targetEmail = email;
        break;
      }
    }

    if (targetEmail) {
      this.users.delete(targetEmail);
      this.persist();

      if (pgStore.isConfigured()) {
        pgStore.deleteAppUser(userId).catch(() => {});
      }
      return true;
    }
    return false;
  }

  public updateUserRole(userId: string, newRole: UserRole): boolean {
    for (const [email, u] of this.users.entries()) {
      if (u.id === userId) {
        if (email === ADMIN_EMAIL.toLowerCase()) {
          throw new Error('Primary administrator role cannot be changed.');
        }
        u.role = newRole === 'ADMIN' ? 'ADMIN' : 'MANAGER';
        this.persist();

        if (pgStore.isConfigured()) {
          pgStore.updateAppUserRole(userId, u.role).catch(() => {});
        }
        return true;
      }
    }
    return false;
  }

  // Restore/sync accounts batch (used by Admin Sync button or file import)
  public restoreUsersBatch(usersList: any[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

    for (const item of usersList) {
      if (!item || !item.email || !item.email.includes('@')) continue;
      const email = item.email.toLowerCase().trim();

      // Don't overwrite admin's core credentials
      if (email === ADMIN_EMAIL.toLowerCase()) continue;

      const role: UserRole = item.role === 'ADMIN' ? 'ADMIN' : 'MANAGER';
      const existing = this.users.get(email);

      let salt = item.salt;
      let passwordHash = item.passwordHash;

      // If plain password provided during restore
      if (item.password && (!passwordHash || !salt)) {
        salt = crypto.randomBytes(16).toString('hex');
        passwordHash = hashPassword(item.password, salt);
      }

      if (!passwordHash || !salt) continue;

      const userRecord: AppUser = {
        id: item.id || existing?.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        email,
        name: item.name || email.split('@')[0],
        role,
        passwordHash,
        salt,
        createdAt: item.createdAt || existing?.createdAt || new Date().toISOString(),
      };

      if (existing) {
        this.users.set(email, userRecord);
        updated++;
      } else {
        this.users.set(email, userRecord);
        added++;
      }

      if (pgStore.isConfigured()) {
        pgStore
          .upsertAppUser({
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.name,
            role: userRecord.role,
            passwordHash: userRecord.passwordHash,
            salt: userRecord.salt,
            createdAt: userRecord.createdAt,
          })
          .catch(() => {});
      }
    }

    if (added > 0 || updated > 0) {
      this.persist();
    }

    return { added, updated };
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
      throw new Error('Invalid email or password.');
    }

    // 2. Created Manager & Admin accounts
    const user = this.users.get(normalizedEmail);
    if (!user) {
      throw new Error('Access restricted. Only users created by the administrator can access this application.');
    }

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      throw new Error('Invalid email or password.');
    }

    const effectiveRole: UserRole = user.role === 'ADMIN' ? 'ADMIN' : 'MANAGER';

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

      const role: UserRole = data.role === 'ADMIN' ? 'ADMIN' : 'MANAGER';

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
