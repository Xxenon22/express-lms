import { pool } from "../config/db.js";

const maintenanceMiddleware = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT status
            FROM maintance
            LIMIT 1
        `);

        res.json({
            status: result.rows[0]?.status ?? false
        });
    } catch (err) {
        console.error("Maintenance middleware error:", err);
        res.status(500).json({ status: false });
    }
};

export default maintenanceMiddleware;
