import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// get status
router.get("/", async (req, res) => {
    const result = await pool.query(
        "SELECT status FROM maintance LIMIT 1"
    );

    res.json({
        status: result.rows[0]?.status ?? false
    });
});

// update status (admin only)
router.put("/", async (req, res) => {
    const { status } = req.body;

    await pool.query(
        "UPDATE maintance SET status = $1",
        [status]
    );

    res.json({ success: true });
});

export default router;
