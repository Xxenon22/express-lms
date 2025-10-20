// routes/rpkRefleksi.js
import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🧭 Helper: konversi tanggal agar tidak mundur 1 hari
function toLocalDateString(dateInput) {
    if (!dateInput) return null;
    const date = new Date(dateInput);

    // Konversi manual ke zona waktu WIB (GMT+7)
    const offsetDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);

    const year = offsetDate.getFullYear();
    const month = String(offsetDate.getMonth() + 1).padStart(2, "0");
    const day = String(offsetDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// =========================================================
// GET semua refleksi berdasarkan guru login
// =========================================================
router.get("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id;
        const result = await pool.query(`
      SELECT rr.*,
             rb.name_rombel,
             u.username AS teacher_name,
             dg.name AS instructor_name,
             g.grade_lvl AS name_grade
      FROM rpk_refleksi rr
      LEFT JOIN rombel rb ON rr.rombel_id = rb.id
      LEFT JOIN users u ON rr.guru_id = u.id
      LEFT JOIN db_guru dg ON rr.instructor = dg.id
      LEFT JOIN grade_level g ON rb.grade_id = g.id
      WHERE rr.guru_id = $1
    `, [guruId]);

        res.json(result.rows);
    } catch (error) {
        console.error("Fetch rpk_refleksi error:", error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================
// GET semua refleksi untuk admin
// =========================================================
router.get("/all-rpk2/:id", verifyToken, async (req, res) => {
    try {
        const guruId = req.params.id;
        const result = await pool.query(`
      SELECT rr.*,
             rb.name_rombel,
             dm.nama_mapel,
             u.username AS teacher_name,
             dg.name AS instructor_name,
             g.grade_lvl AS name_grade
      FROM rpk_refleksi rr
      LEFT JOIN rombel rb ON rr.rombel_id = rb.id
      LEFT JOIN users u ON rr.guru_id = u.id
      LEFT JOIN db_guru dg ON rr.instructor = dg.id
      LEFT JOIN db_mapel dm ON rr.mapel_id = dm.id
      LEFT JOIN grade_level g ON rb.grade_id = g.id
      WHERE rr.guru_id = $1
    `, [guruId]);

        res.json(result.rows);
    } catch (error) {
        console.error("Fetch rpk_refleksi2 error:", error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================
// GET by ID
// =========================================================
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
      SELECT rr.*,
             rb.name_rombel,
             dm.nama_mapel AS subject,
             u.username AS teacher_name,
             dg.name AS instructor_name,
             g.grade_lvl AS name_grade
      FROM rpk_refleksi rr
      LEFT JOIN rombel rb ON rr.rombel_id = rb.id
      LEFT JOIN kelas k ON k.rombel_id = rb.id
      LEFT JOIN db_mapel dm ON k.id_mapel = dm.id
      LEFT JOIN users u ON rr.guru_id = u.id
      LEFT JOIN db_guru dg ON rr.instructor = dg.id
      LEFT JOIN grade_level g ON rb.grade_id = g.id
      WHERE rr.id = $1
    `, [id]);

        if (result.rows.length === 0)
            return res.status(404).json({ message: "Learning Reflection not found" });

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Fetch rpk_refleksi by ID error:", error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================
// CREATE
// =========================================================
router.post("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id;
        let {
            mapel_id,
            rombel_id,
            hari_tanggal,
            instructor,
            waktu,
            refleksi_siswa,
            refleksi_guru,
            tngkt_pencapaian,
            desk_pencapaian,
            follow_up,
            pendampingan_siswa,
            keterangan
        } = req.body;

        if (hari_tanggal) hari_tanggal = toLocalDateString(hari_tanggal);

        const result = await pool.query(
            `INSERT INTO rpk_refleksi (
        mapel_id, rombel_id, hari_tanggal, instructor, waktu,
        refleksi_siswa, refleksi_guru, tngkt_pencapaian, desk_pencapaian,
        follow_up, pendampingan_siswa, keterangan, guru_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
            [
                mapel_id,
                rombel_id,
                hari_tanggal,
                instructor,
                waktu,
                refleksi_siswa,
                refleksi_guru,
                tngkt_pencapaian,
                desk_pencapaian,
                follow_up,
                pendampingan_siswa,
                keterangan,
                guruId
            ]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Insert rpk_refleksi error:", err);
        res.status(500).json({ message: "Insert failed" });
    }
});

// =========================================================
// UPDATE
// =========================================================
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const guruId = req.users.id;
        const updates = { ...req.body, guru_id: guruId };

        if (updates.hari_tanggal) {
            updates.hari_tanggal = toLocalDateString(updates.hari_tanggal);
        }

        const fields = Object.keys(updates);
        if (fields.length === 0)
            return res.status(400).json({ message: "No fields to update" });

        const values = Object.values(updates);
        const setQuery = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");

        const result = await pool.query(
            `UPDATE rpk_refleksi SET ${setQuery} WHERE id = $${fields.length + 1} RETURNING *`,
            [...values, id]
        );

        if (result.rowCount === 0)
            return res.status(404).json({ message: "Data not found" });

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update rpk_refleksi error:", err);
        res.status(500).json({ message: "Update error" });
    }
});

// =========================================================
// DELETE
// =========================================================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM rpk_refleksi WHERE id = $1`, [id]);
        res.json({ message: "Learning Reflection deleted" });
    } catch (err) {
        console.error("Delete rpk_refleksi error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
