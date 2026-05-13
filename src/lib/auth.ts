import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "dsl_token";

const JWT_SECRET = process.env.JWT_SECRET;

function getJwtSecret() {
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET 未配置或长度不足");
  }
  return JWT_SECRET;
}

export type SessionUser = {
  doubanUid: string;
  doubanName: string;
};

export function signToken(user: SessionUser) {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser;
  } catch {
    return null;
  }
}

export function getUserFromToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  return verifyToken(token);
}
