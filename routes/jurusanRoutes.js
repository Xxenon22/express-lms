import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// Get user profile by token
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM jurusan ORDER BY id ASC"
        );

        // if (result.rows.length === 0) {
        //     return res.status(404).json({ message: "User not found" });
        // }

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
