// routes/mengaplikasikanRoutes.js
import express from "express";
import { pool } from "../config/db.js";
const router = express.Router();

// CRUD rpk_mengaplikasikan
router.get("/", async (req, res) => {
    const result = await pool.query("SELECT * FROM rpk_mengaplikasikan ORDER BY id DESC");
    res.json(result.rows);
});

router.post("/", async (req, res) => {
    const { mengaplikasikan, berkesadaran, bermakna, menggembirakan, asesmen_mengaplikasikan } = req.body;
    const result = await pool.query(
        `INSERT INTO rpk_mengaplikasikan (mengaplikasikan, berkesadaran, bermakna, menggembirakan, asesmen_mengaplikasikan)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [mengaplikasikan, berkesadaran, bermakna, menggembirakan, asesmen_mengaplikasikan]
    );
    res.json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);
    const setQuery = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");

    const result = await pool.query(
        `UPDATE rpk_mengaplikasikan SET ${setQuery} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, id]
    );
    res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    await pool.query(`DELETE FROM rpk_mengaplikasikan WHERE id = $1`, [id]);
    res.json({ message: "Mengaplikasikan deleted" });
});

export default router;
