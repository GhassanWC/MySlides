import { v4 as uuid } from 'uuid';
const users = new Map();
export function findUserByEmail(email) {
    const normalized = email.trim().toLowerCase();
    return [...users.values()].find((u) => u.email === normalized);
}
export function findUserById(id) {
    return users.get(id);
}
export function createUser(email, passwordHash) {
    const normalized = email.trim().toLowerCase();
    if (findUserByEmail(normalized)) {
        throw new Error('User already exists');
    }
    const user = {
        id: uuid(),
        email: normalized,
        passwordHash,
        createdAt: new Date(),
    };
    users.set(user.id, user);
    return user;
}
