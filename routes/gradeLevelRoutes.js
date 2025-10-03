import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// Get all mapel
router.get("/", async (req, res) => {
    const result = await pool.query("SELECT * FROM grade_level ORDER BY id ASC");
    res.json(result.rows);
});

// Create
router.post("/", async (req, res) => {
    const { grade_lvl } = req.body;
    const result = await pool.query(
        "INSERT INTO grade_level (grade_lvl) VALUES ($1) RETURNING *",
        [grade_lvl]
    );
    res.json(result.rows[0]);
});

// Update
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { grade_lvl } = req.body;
    const result = await pool.query(
        "UPDATE grade_level SET grade_lvl=$1 WHERE id=$2 RETURNING *",
        [grade_lvl, id]
    );
    res.json(result.rows[0]);
});

// Delete
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM grade_level WHERE id=$1", [id]);
    res.json({ message: "grade deleted" });
});

export default router;
