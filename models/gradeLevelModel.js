import { pool } from "../config/db.js";

// Get all grade levels
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM grade_level ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Add grade level
router.post("/", async (req, res) => {
    const { grade_lvl } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO grade_level (grade_lvl) VALUES ($1) RETURNING *",
            [grade_lvl]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
