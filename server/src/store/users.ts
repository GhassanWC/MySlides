import { v4 as uuid } from 'uuid';

/**
 * In-memory user store. Replace with a database (e.g. PostgreSQL + Prisma) for production.
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

const users = new Map<string, User>();

export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return [...users.values()].find((u) => u.email === normalized);
}

export function findUserById(id: string): User | undefined {
  return users.get(id);
}

export function createUser(email: string, passwordHash: string): User {
  const normalized = email.trim().toLowerCase();
  if (findUserByEmail(normalized)) {
    throw new Error('User already exists');
  }
  const user: User = {
    id: uuid(),
    email: normalized,
    passwordHash,
    createdAt: new Date(),
  };
  users.set(user.id, user);
  return user;
}
