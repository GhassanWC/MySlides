const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
    console.warn('SESSION_SECRET should be at least 32 characters. Using fallback for development.');
}
export const sessionConfig = {
    secret: sessionSecret ?? 'dev-secret-min-32-characters-long-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax',
    },
    name: 'myslides.sid',
};
