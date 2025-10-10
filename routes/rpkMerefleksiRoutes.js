// routes/merefleksiRoutes.js
import express from "express";
import { pool } from "../config/db.js";
const router = express.Router();

// CRUD rpk_merefleksi
router.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM rpk_merefleksi ORDER BY id DESC");
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { merefleksi, berkesadaran, bermakna, menggembirakan, asesmen_merefleksi } = req.body;
  const result = await pool.query(
    `INSERT INTO rpk_merefleksi (merefleksi, berkesadaran, bermakna, menggembirakan, asesmen_merefleksi)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [merefleksi, berkesadaran, bermakna, menggembirakan, asesmen_merefleksi]
  );
  res.json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const fields = Object.keys(req.body);
  const values = Object.values(req.body);
  const setQuery = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");

  const result = await pool.query(
    `UPDATE rpk_merefleksi SET ${setQuery} WHERE id = $${fields.length + 1} RETURNING *`,
    [...values, id]
  );
  res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query(`DELETE FROM rpk_merefleksi WHERE id = $1`, [id]);
  res.json({ message: "Sucess deleted" });
});

export default router;
