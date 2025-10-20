import express from "express";
import { pool } from "../config/db.js";
const router = express.Router();

// GET all
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM rpk_memahami ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database error" });
    }
});

// CREATE
router.post("/", async (req, res) => {
    try {
        const { memahami, berkesadaran, bermakna, menggembirakan, asesmen_memahami } = req.body;
        const result = await pool.query(
            `INSERT INTO rpk_memahami (memahami, berkesadaran, bermakna, menggembirakan, asesmen_memahami)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [memahami, berkesadaran, bermakna, menggembirakan, asesmen_memahami]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Insert error" });
    }
});

// UPDATE
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const fields = Object.keys(req.body);
        if (fields.length === 0) return res.status(400).json({ message: "No fields to update" });

        const values = Object.values(req.body);
        const setQuery = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");

        const result = await pool.query(
            `UPDATE rpk_memahami SET ${setQuery} WHERE id = $${fields.length + 1} RETURNING *`,
            [...values, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ message: "Data not found" });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Update error" });
    }
});

// DELETE
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query(`DELETE FROM rpk_memahami WHERE id = $1`, [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Data not found" });
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Delete error" });
    }
});

export default router;
