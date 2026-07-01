import { createHmac, randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'sushichain-super-secret-key-change-in-production-2024';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'sushichain-refresh-secret-key-change-in-production-2024';

export interface TokenPayload {
  userId: string;
  role: string;
  phone?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

function base64url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url');
}

function encodeJwt(payload: object, secret: string, expiresIn: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const expMap: Record<string, number> = { '15m': 900, '1h': 3600, '7d': 604800, '30d': 2592000 };
  const expSeconds = expMap[expiresIn] || 900;
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expSeconds }));
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function decodeJwt(token: string, secret: string): TokenPayload | null {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expectedSig = createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  return encodeJwt(payload, JWT_SECRET, '15m');
}

export async function generateRefreshToken(): Promise<string> {
  const random = randomBytes(32).toString('hex');
  return encodeJwt({ random }, REFRESH_SECRET, '30d');
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  return decodeJwt(token, JWT_SECRET);
}

export async function verifyRefreshToken(token: string): Promise<boolean> {
  return decodeJwt(token, REFRESH_SECRET) !== null;
}

export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `hashed_${hash}_${password.length}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}