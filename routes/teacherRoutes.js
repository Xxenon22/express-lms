import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// Get all mapel
router.get("/", async (req, res) => {
    const result = await pool.query("SELECT * FROM db_guru ORDER BY id ASC");
    res.json(result.rows);
});

// Create
router.post("/", async (req, res) => {
    const { name } = req.body;
    const result = await pool.query(
        "INSERT INTO db_guru (name) VALUES ($1) RETURNING *",
        [name]
    );
    res.json(result.rows[0]);
});

// Update
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const result = await pool.query(
        "UPDATE db_guru SET name=$1 WHERE id=$2 RETURNING *",
        [name, id]
    );
    res.json(result.rows[0]);
});

// Delete
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM db_guru WHERE id=$1", [id]);
    res.json({ message: "Teacher deleted" });
});

export default router;
