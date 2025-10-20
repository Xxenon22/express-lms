import express from "express";
import { pool } from "../config/db.js";
const router = express.Router();

// GET all
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM rpk_merefleksi ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error" });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const { merefleksi, berkesadaran, bermakna, menggembirakan, asesmen_merefleksi } = req.body;
    const result = await pool.query(
      `INSERT INTO rpk_merefleksi (merefleksi, berkesadaran, bermakna, menggembirakan, asesmen_merefleksi)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [merefleksi, berkesadaran, bermakna, menggembirakan, asesmen_merefleksi]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Insert error" });
  }
});

// UPDATE (aman, tidak menghapus kolom lain)
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;

    const entries = Object.entries(data).filter(([_, v]) => v !== undefined && v !== null);
    if (entries.length === 0)
      return res.status(400).json({ message: "No fields to update" });

    const setQuery = entries.map(([key], i) => `${key} = $${i + 1}`).join(", ");
    const values = entries.map(([_, value]) => value);

    const result = await pool.query(
      `UPDATE rpk_merefleksi SET ${setQuery} WHERE id = $${entries.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ message: "Data not found" });

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
    const result = await pool.query(`DELETE FROM rpk_merefleksi WHERE id = $1`, [id]);
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Data not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete error" });
  }
});

export default router;
