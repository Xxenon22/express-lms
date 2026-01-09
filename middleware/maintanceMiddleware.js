import { pool } from "../config/db.js";
import jwt from "jsonwebtoken";

const MAINTENANCE_WHITELIST = [
    "onymaharani@gmail.com",
    "anantastorage42@gmail.com",
    "gigaananta2007@gmail.com",
    "gigaananta674@gmail.com"
];

// endpoint yang tetap boleh diakses
const MAINTENANCE_BYPASS_PATHS = [
    "/auth/login",
    "/auth/register",
    "/auth/verify",
    "/maintenance"
];

const maintenanceMiddleware = async (req, res, next) => {
    try {
        // 1️⃣ Bypass endpoint penting
        if (MAINTENANCE_BYPASS_PATHS.some(p => req.path.startsWith(p))) {
            return next();
        }

        let userEmail = null;

        // 2️⃣ Ambil user dari JWT (jika sudah login)
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userEmail = decoded.email;
        }

        // 3️⃣ Bypass whitelist user
        if (userEmail && MAINTENANCE_WHITELIST.includes(userEmail)) {
            return next();
        }

        // 4️⃣ Cek status maintenance
        const result = await pool.query(
            "SELECT status FROM maintance LIMIT 1"
        );

        if (result.rows[0]?.status) {
            return res.status(503).json({
                maintenance: true,
                message: "System is under maintenance"
            });
        }

        next();
    } catch (err) {
        console.error("Maintenance middleware error:", err);
        next();
    }
};

export default maintenanceMiddleware;
