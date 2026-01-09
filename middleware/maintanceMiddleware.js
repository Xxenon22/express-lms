const maintenanceMiddleware = async (req, res, next) => {
    try {
        const result = await pool.query(
            "SELECT status FROM maintance LIMIT 1"
        );

        if (result.rows[0]?.status) {
            return res.status(503).json({
                status: true,
                message: "System under maintenance"
            });
        }

        next();
    } catch (err) {
        console.error("Maintenance middleware error:", err);
        next();
    }
};

export default maintenanceMiddleware;
