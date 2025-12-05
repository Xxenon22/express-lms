import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();
// GET all number rombel
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM number_rombel ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database error" });
    }
});

export default router;