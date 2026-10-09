import jwt, { type SignOptions } from 'jsonwebtoken';

const getSecret = (name: string): string => {
    const secret = process.env[name];
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
        throw new Error(`${name} must contain at least 32 bytes`);
    }
    return secret;
};

const ACCESS_SECRET = getSecret('JWT_ACCESS_SECRET');
const REFRESH_SECRET = getSecret('JWT_REFRESH_SECRET');
const JWT_ISSUER = 'learnforge-api';

export interface JwtPayload {
    sub: string;
    role?: string;
    tokenUse: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}

export const signAccessToken = (payload: { sub: string; role: string }): string => {
    return jwt.sign({ ...payload, tokenUse: 'access' }, ACCESS_SECRET, {
        algorithm: 'HS256',
        issuer: JWT_ISSUER,
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
    });
};

export const signRefreshToken = (payload: { sub: string }): string => {
    return jwt.sign({ ...payload, tokenUse: 'refresh' }, REFRESH_SECRET, {
        algorithm: 'HS256',
        issuer: JWT_ISSUER,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
    });
};

export const verifyAccessToken = (token: string): JwtPayload => {
    const payload = jwt.verify(token, ACCESS_SECRET, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
    });
    if (typeof payload === 'string' || payload.tokenUse !== 'access') {
        throw new Error('Invalid access token');
    }
    return payload as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
    const payload = jwt.verify(token, REFRESH_SECRET, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
    });
    if (typeof payload === 'string' || payload.tokenUse !== 'refresh') {
        throw new Error('Invalid refresh token');
    }
    return payload as JwtPayload;
};
