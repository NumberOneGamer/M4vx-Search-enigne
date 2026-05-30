import { compare, hash } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, type User } from '@/db/schema/users';
import { eq } from 'drizzle-orm';
import type { TokenPayload, AuthUser, AuthResponse } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export function clearAuthCookie(): void {
  const cookieStore = cookies();
  cookieStore.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export function getTokenFromCookies(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token');
  return token?.value || null;
}

export function getTokenFromHeader(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function getCurrentUser(token: string): Promise<AuthUser | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user.length) return null;

  return {
    id: user[0].id,
    email: user[0].email,
    name: user[0].name,
    role: user[0].role as 'user' | 'admin',
    avatarUrl: user[0].avatarUrl || undefined,
  };
}

export async function authenticateUser(request: Request): Promise<AuthUser | null> {
  const token = getTokenFromHeader(request) || getTokenFromCookies();
  if (!token) return null;
  return getCurrentUser(token);
}

export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await authenticateUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(request: Request): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    throw new Error('Email already registered');
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();

  const token = generateToken({ userId: user.id, role: user.role });
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role as 'user' | 'admin' },
    token,
  };
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken({ userId: user.id, role: user.role });
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role as 'user' | 'admin' },
    token,
  };
}
