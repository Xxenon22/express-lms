import express from "express";
import { pool } from "../config/db.js";

const router = express.Router();

// Get all mapel
router.get("/", async (req, res) => {
    const result = await pool.query("SELECT * FROM db_mapel ORDER BY id ASC");
    res.json(result.rows);
});

// Create
router.post("/", async (req, res) => {
    const { nama_mapel } = req.body;
    const result = await pool.query(
        "INSERT INTO db_mapel (nama_mapel) VALUES ($1) RETURNING *",
        [nama_mapel]
    );
    res.json(result.rows[0]);
});

// Update
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { nama_mapel } = req.body;
    const result = await pool.query(
        "UPDATE db_mapel SET nama_mapel=$1 WHERE id=$2 RETURNING *",
        [nama_mapel, id]
    );
    res.json(result.rows[0]);
});

// Delete
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM db_mapel WHERE id=$1", [id]);
    res.json({ message: "Mapel deleted" });
});

export default router;