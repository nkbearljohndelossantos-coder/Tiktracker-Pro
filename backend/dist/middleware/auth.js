import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_token_for_tiktracker_pro_2026';
/**
 * Middleware to protect routes and verify token signatures
 */
export const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('JWT Verification failed:', err.message);
                return res.status(403).json({ error: 'Token signature is invalid or expired.' });
            }
            req.user = decoded;
            next();
        });
    }
    else {
        res.status(401).json({ error: 'Authorization header is missing or malformed.' });
    }
};
/**
 * Middleware to assert minimum RBAC tier clearance
 */
export const authorizeRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Clearance level insufficient to access this action.' });
        }
        next();
    };
};
