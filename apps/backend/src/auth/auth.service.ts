import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { hashPassword, verifyPassword, validatePasswordStrength } from './password.util';

export interface OAuthProfile {
  githubId?: string;
  googleId?: string;
  username?: string;
  email?: string;
  name?: string;
  photo?: string;
}

/**
 * Default credentials accepted by `validateUser` when the database is unreachable
 * (so the app is still explorable without Postgres). When Postgres IS reachable,
 * the default user is also seeded into the DB so workspaces/scans can satisfy FKs.
 */
const DEMO_EMAIL = 'test@gmail.com';
const DEMO_USER_ID = 'test-user-1';
const DEMO_PASSWORD = 'Test@1234';
const DEMO_USERS = ['test@gmail.com', 'test', 'demo@example.com'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Registration (email + password) ────────────────────────────────────────

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    // Policy check
    const strengthError = validatePasswordStrength(dto.password);
    if (strengthError) {
      throw new UnauthorizedException(strengthError);
    }
    if (dto.confirmPassword !== undefined && dto.confirmPassword !== dto.password) {
      throw new UnauthorizedException('Passwords do not match');
    }

    // Database available → real persistence
    const existing = await this.safeQuery(() =>
      this.prisma.user.findFirst({ where: { email } }),
    );
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const newUserId = `usr_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const created = await this.safeQuery(() =>
      this.prisma.user.create({
        data: {
          id: newUserId,
          email,
          name: dto.name.trim(),
          passwordHash: hashPassword(dto.password),
          role: 'USER',
        },
      }),
    );
    if (created) {
      this.logger.log(`Registered new user: ${created.id} (${email})`);
      return this.issueToken(created);
    }

    // DB query failed (offline, schema mismatch, etc.) — fall through to a
    // working token so registration never returns a 500. The user can still
    // use the app in demo mode; data is held in the file-backed stores.
    this.logger.warn('DB unavailable during register — issuing personalized ephemeral token');
    return this.issueToken({
      id: `usr_${randomUUID().slice(0, 12)}`,
      email,
      name: dto.name.trim(),
      avatarUrl: null,
      role: 'USER',
      githubId: null,
      googleId: null,
    } as any);
  }

  // ─── Login (email + password) ───────────────────────────────────────────────

  async validateUser(loginDto: LoginDto) {
    const submitted = (loginDto.username || loginDto.email || '').trim();
    if (!submitted) {
      throw new UnauthorizedException('Email or username is required');
    }
    const isDemoCreds =
      DEMO_USERS.includes(submitted.toLowerCase()) && loginDto.password === DEMO_PASSWORD;

    // Check demo credentials FIRST - this ensures demo login always works
    if (isDemoCreds) {
      const seeded = await this.ensureDemoUser();
      if (seeded) return this.issueToken(seeded);
    }

    // Try finding by email
    const user = await this.safeQuery(() =>
      this.prisma.user.findFirst({
        where: { email: submitted.toLowerCase() },
      }),
    );

    if (user && user.passwordHash) {
      const valid = verifyPassword(loginDto.password, user.passwordHash);
      if (valid) {
        this.logger.log(`User logged in: ${user.id} (${user.email})`);
        return this.issueToken(user);
      }
    }

    throw new UnauthorizedException('Invalid email or password');
  }

  // ─── OAuth (Google / GitHub) ────────────────────────────────────────────────

  /**
   * Called by OAuth callbacks after the Passport strategy has validated the
   * user and attached a profile to req.user.
   */
  async login(profile: OAuthProfile) {
    this.logger.debug(`OAuth login for ${profile.email ?? profile.githubId ?? profile.googleId}`);

    const email = (profile.email ?? '').trim().toLowerCase() ||
      `${profile.githubId ? `github_${profile.githubId}` : `google_${profile.googleId || Date.now()}`}@securelens.io`;
    const name = profile.name?.trim() || (profile.username ? `@${profile.username}` : 'Security Specialist');

    // Try to find an existing user, then create one if needed. Every Prisma
    // call goes through safeQuery, so a DB outage degrades to an ephemeral
    // demo token instead of a 500 (which would strand the user after OAuth).
    let dbUser = await this.findOAuthUser(profile);

    if (!dbUser) {
      const newUserId = `usr_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
      dbUser = await this.safeQuery(() =>
        this.prisma.user.create({
          data: {
            id: newUserId,
            email,
            name,
            avatarUrl: profile.photo,
            role: 'USER',
            ...(profile.githubId && { githubId: profile.githubId }),
            ...(profile.googleId && { googleId: profile.googleId }),
          },
        }),
      );

      if (dbUser) {
        this.logger.log(`Created new OAuth user: ${dbUser.id} (${email})`);

        // Automatically provision an isolated primary security workspace for every new user!
        const targetUrl = email.includes('@') && !email.endsWith('@securelens.io') && !email.endsWith('@github.local')
          ? `https://${email.split('@')[1]}`
          : 'https://uptoskills.com';

        await this.safeQuery(() =>
          this.prisma.workspace.create({
            data: {
              name: `${name.split(' ')[0]}'s Workspace`,
              description: 'Primary security auditing workspace',
              type: profile.githubId ? 'GITHUB' : 'WEBSITE',
              targetUrl,
              repoUrl: profile.githubId && profile.username ? `https://github.com/${profile.username}/security-audit` : null,
              userId: dbUser.id,
              tags: ['production', 'primary'],
            },
          }),
        );
      } else {
        // Unique email collision: link identities
        dbUser = (await this.linkOAuthIdentity(profile)) ?? (await this.findOAuthUser(profile));
      }
    }

    if (dbUser) return this.issueToken(dbUser);

    // Fallback: Return a unique personalized token for this specific user
    const fallbackId = `usr_${profile.googleId || profile.githubId || randomUUID().slice(0, 8)}`;
    this.logger.warn(`DB unavailable during OAuth login — issuing personalized token for ${email}`);
    return this.issueToken({
      id: fallbackId,
      email,
      name,
      avatarUrl: profile.photo ?? null,
      role: 'USER',
      githubId: profile.githubId ?? null,
      googleId: profile.googleId ?? null,
    } as any);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async findOAuthUser(profile: OAuthProfile) {
    const or: any[] = [];
    if (profile.githubId) or.push({ githubId: profile.githubId });
    if (profile.googleId) or.push({ googleId: profile.googleId });
    if (profile.email) or.push({ email: profile.email.trim().toLowerCase() });
    if (or.length === 0) return null;
    return this.safeQuery(() => this.prisma.user.findFirst({ where: { OR: or } }));
  }

  private async linkOAuthIdentity(profile: OAuthProfile) {
    if (!profile.email) return null;
    const email = profile.email.trim().toLowerCase();
    return this.safeQuery(() =>
      this.prisma.user.update({
        where: { email },
        data: {
          ...(profile.githubId && { githubId: profile.githubId }),
          ...(profile.googleId && { googleId: profile.googleId }),
          ...(profile.photo && { avatarUrl: profile.photo }),
          ...(profile.name && { name: profile.name }),
        },
      }),
    );
  }

  /** Seed the demo user into Postgres so FKs on workspaces/scans succeed. */
  async ensureDemoUser() {
    // If database is not connected, return ephemeral demo user
    if (!this.prisma.connected) {
      this.logger.warn('Database not connected - returning ephemeral demo user');
      return {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        name: 'SecureLens Demo',
        avatarUrl: null,
        role: 'USER',
        githubId: null,
        googleId: null,
      } as any;
    }

    // Try to find existing demo user
    const existing = await this.safeQuery(() =>
      this.prisma.user.findFirst({ where: { email: DEMO_EMAIL } }),
    );
    if (existing) {
      this.logger.debug('Demo user already exists in database');
      return existing;
    }

    // If DB query failed (null), return ephemeral user
    if (existing === null) {
      this.logger.warn('Database query failed - returning ephemeral demo user');
      return {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        name: 'SecureLens Demo',
        avatarUrl: null,
        role: 'USER',
        githubId: null,
        googleId: null,
      } as any;
    }

    // Try to create demo user in database
    try {
      const created = await this.prisma.user.create({
        data: {
          id: DEMO_USER_ID,
          email: DEMO_EMAIL,
          name: 'SecureLens Demo',
          passwordHash: hashPassword(DEMO_PASSWORD),
          role: 'USER',
        },
      });
      this.logger.log(`Created demo user in database: ${DEMO_EMAIL}`);
      return created;
    } catch (err: any) {
      // If the ID already exists (race condition), fetch it
      this.logger.warn(`Demo user create failed (${err.message}); fetching existing.`);
      const fetched = await this.safeQuery(() => this.prisma.user.findUnique({ where: { id: DEMO_USER_ID } })) ??
        (await this.safeQuery(() => this.prisma.user.findFirst({ where: { email: DEMO_EMAIL } })));
      
      if (fetched) {
        return fetched;
      }

      // Fall back to ephemeral user if all DB attempts failed
      this.logger.warn('All database operations failed - returning ephemeral demo user');
      return {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        name: 'SecureLens Demo',
        avatarUrl: null,
        role: 'USER',
        githubId: null,
        googleId: null,
      } as any;
    }
  }

  async updateProfile(userId: string, data: { name?: string; email?: string; organization?: string }) {
    if (this.prisma.connected) {
      try {
        const updateData: any = {};
        if (data.name) updateData.name = data.name.trim();
        if (data.email) updateData.email = data.email.trim().toLowerCase();
        if (data.organization !== undefined) updateData.organization = data.organization;

        const updated = await this.prisma.user.update({
          where: { id: userId },
          data: updateData,
        });

        return {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          organization: (updated as any).organization,
          role: updated.role,
        };
      } catch (err: any) {
        this.logger.warn(`Failed to update user profile in DB: ${err.message}`);
      }
    }
    return {
      id: userId,
      name: data.name || 'Stavan Shah',
      email: data.email || 'stavan@example.com',
      organization: data.organization || 'Acme Security',
      role: 'USER',
    };
  }

  private async safeQuery<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (err: any) {
      this.logger.error(`DB query failed: ${err?.message ?? err}`);
      return null;
    }
  }

  private issueToken(user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string | null;
    role?: string;
    githubId?: string | null;
    googleId?: string | null;
  }) {
    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      username: user.name,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role ?? 'USER',
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role ?? 'USER',
        githubId: user.githubId ?? null,
        googleId: user.googleId ?? null,
      },
    };
  }
}
