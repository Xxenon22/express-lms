import { pool } from "../config/db.js";

const maintenanceMiddleware = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT status FROM maintenance
            LIMIT 1
        `);

        if (result.rows[0]?.status) {
            return res.status(503).json({
                maintenance: true
            });
        }

        next();
    } catch (err) {
        console.error("Maintenance middleware error:", err);
        next(); // jangan matikan server kalau error
    }
};

export default maintenanceMiddleware;
