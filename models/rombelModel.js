import express from "express";
import pool from "../db.js";

const router = express.Router();

// =========================
// GET ALL ROMBEL
// =========================
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                r.id,
                r.name_rombel,
                r.grade_id,
                r.jurusan_id,
                g.grade_lvl AS grade_name,
                j.nama_jurusan AS major,
                num.number AS rombel_number
            FROM rombel r
            LEFT JOIN grade_level g ON g.id = r.grade_id
            LEFT JOIN jurusan j ON j.id = r.jurusan_id
            LEFT JOIN number_rombel num ON num.id = r.name_rombel
            ORDER BY r.id ASC;
        `);

        res.json(result.rows);
    } catch (err) {
        console.error("GET ROMBEL ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// =========================
// UPDATE ROMBEL
// =========================
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { name_rombel, grade_id, jurusan_id } = req.body;

    if (!name_rombel || !grade_id || !jurusan_id) {
        return res.status(400).json({
            message: "name_rombel, grade_id, jurusan_id are required"
        });
    }

    try {
        // Cek apakah rombel ada
        const check = await pool.query(`SELECT * FROM rombel WHERE id = $1`, [id]);

        if (check.rowCount === 0) {
            return res.status(404).json({ message: "Rombel not found" });
        }

        // Update
        await pool.query(
            `UPDATE rombel
             SET name_rombel = $1, grade_id = $2, jurusan_id = $3
             WHERE id = $4`,
            [name_rombel, grade_id, jurusan_id, id]
        );

        return res.json({
            message: "Rombel updated successfully",
            data: {
                id,
                name_rombel,
                grade_id,
                jurusan_id,
            }
        });

    } catch (err) {
        console.error("UPDATE ROMBEL ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// =========================
// DELETE ROMBEL
// =========================
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const check = await pool.query("SELECT * FROM rombel WHERE id = $1", [id]);

        if (check.rowCount === 0) {
            return res.status(404).json({ message: "Rombel not found" });
        }

        await pool.query(`DELETE FROM rombel WHERE id = $1`, [id]);

        return res.json({ message: "Rombel deleted successfully" });

    } catch (err) {
        console.error("DELETE ROMBEL ERROR:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
