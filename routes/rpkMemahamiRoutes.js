import express from "express";
import { pool } from "../config/db.js";
const router = express.Router();

// CRUD rpk_memahami
router.get("/", async (req, res) => {
    const result = await pool.query("SELECT * FROM rpk_memahami ORDER BY id DESC");
    res.json(result.rows);
});

router.post("/", async (req, res) => {
    const { memahami, berkesadaran, bermakna, menggembirakan, asesmen_memahami } = req.body;
    const result = await pool.query(
        `INSERT INTO rpk_memahami (memahami, berkesadaran, bermakna, menggembirakan, asesmen_memahami)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [memahami, berkesadaran, bermakna, menggembirakan, asesmen_memahami]
    );
    res.json(result.rows[0]);
});

router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const fields = Object.keys(req.body);
    const values = Object.values(req.body);
    const setQuery = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");

    const result = await pool.query(
        `UPDATE rpk_memahami SET ${setQuery} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, id]
    );
    res.json(result.rows[0]);
});

router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    await pool.query(`DELETE FROM rpk_memahami WHERE id = $1`, [id]);
    res.json({ message: "Memahami deleted" });
});

export default router;
