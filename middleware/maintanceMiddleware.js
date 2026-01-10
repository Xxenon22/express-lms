import { pool } from "../config/db.js";
import jwt from "jsonwebtoken";

const MAINTENANCE_WHITELIST = [
    "onymaharani@gmail.com",
    "anantastorage42@gmail.com",
    "gigaananta2007@gmail.com",
    "gigaananta674@gmail.com"
];

const MAINTENANCE_BYPASS_PATHS = [
    "/auth/login",
    "/auth/register",
    "/auth/verify",
    "/maintenance"
];

const maintenanceMiddleware = async (req, res, next) => {
    try {
        // 1️⃣ bypass endpoint publik
        if (MAINTENANCE_BYPASS_PATHS.some(p => req.path.startsWith(p))) {
            return next();
        }

        // 2️⃣ cek status maintenance
        const result = await pool.query(
            "SELECT status FROM maintance LIMIT 1"
        );

        const isMaintenance = result.rows[0]?.status ?? false;
        if (!isMaintenance) return next();

        // 3️⃣ maintenance ON → cek whitelist
        let email = null;
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                email = decoded.email;
            } catch {
                email = null;
            }
        }

        if (email && MAINTENANCE_WHITELIST.includes(email)) {
            return next(); // ✅ whitelist lolos
        }

        // 4️⃣ block user lain
        return res.status(503).json({
            maintenance: true,
            message: "System is under maintenance"
        });

    } catch (err) {
        console.error("Maintenance error:", err);
        return res.status(503).json({
            maintenance: true,
            message: "System is under maintenance"
        });
    }
};

export default maintenanceMiddleware;
