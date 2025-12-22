// routes/rpkRefleksi.js
import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all refleksi by teacher id
router.get("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id
        const result = await pool.query(`
      SELECT rr.*,
             rb.name_rombel,
             u.username AS teacher_name,
             dg.name AS instructor_name,
             g.grade_lvl AS name_grade,
             m.nama_jurusan AS major
      FROM rpk_refleksi rr
      LEFT JOIN rombel rb ON rr.rombel_id = rb.id
      LEFT JOIN users u ON rr.guru_id = u.id
      LEFT JOIN db_guru dg ON rr.instructor = dg.id
      LEFT JOIN grade_level g ON rb.grade_id = g.id
      LEFT JOIN jurusan m ON rb.jurusan_id = m.id
      WHERE rr.guru_id = $1
    `, [guruId]);

        res.json(result.rows);
    } catch (error) {
        console.error("Fetch rpk_refleksi error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET all refleksi (untuk halaman admin)
router.get("/all-rpk2/:id", verifyToken, async (req, res) => {
    try {
        const guruId = req.params.id
        const result = await pool.query(`
      SELECT rr.*,
             rb.name_rombel,
             dm.nama_mapel,
             u.username AS teacher_name,
             dg.name AS instructor_name,
             g.grade_lvl AS name_grade,
             m.nama_jurusan AS major
      FROM rpk_refleksi rr
      LEFT JOIN rombel rb ON rr.rombel_id = rb.id
      LEFT JOIN users u ON rr.guru_id = u.id
      LEFT JOIN db_guru dg ON rr.instructor = dg.id
      LEFT JOIN db_mapel dm ON rr.mapel_id = dm.id
      LEFT JOIN grade_level g ON rb.grade_id = g.id
      LEFT JOIN jurusan m ON rb.jurusan_id = m.id
      WHERE rr.guru_id = $1
    `, [guruId]);

        res.json(result.rows);
    } catch (error) {
        console.error("Fetch rpk_refleksi2 error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET by ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT rr.*,
                   rb.name_rombel,
                   dm.nama_mapel AS subject,
                   u.username AS teacher_name,
                   dg.name AS instructor_name,
                   g.grade_lvl AS name_grade,
                     m.nama_jurusan AS major
            FROM rpk_refleksi rr
            LEFT JOIN rombel rb ON rr.rombel_id = rb.id
            LEFT JOIN kelas k ON k.rombel_id = rr.kelas_id      -- ✅ tambahkan join ke kelas
            LEFT JOIN db_mapel dm ON dm.id = k.id_mapel  -- ✅ ambil subject
            LEFT JOIN users u ON rr.guru_id = u.id
            LEFT JOIN db_guru dg ON rr.instructor = dg.id
            LEFT JOIN grade_level g ON rb.grade_id = g.id
            LEFT JOIN jurusan m ON rb.jurusan_id = m.id
            WHERE rr.id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Learning Reflection not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Fetch rpk_refleksi by ID error:", error);
        res.status(500).json({ error: error.message });
    }
});

// CREATE
router.post("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id; // dari JWT
        const {
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

// UPDATE
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const guruId = req.users.id; // dari JWT

        const {
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

        const result = await pool.query(
            `
            UPDATE rpk_refleksi
            SET mapel_id = $1,
                rombel_id = $2,
                hari_tanggal = $3,
                instructor = $4,
                waktu = $5,
                refleksi_siswa = $6,
                refleksi_guru = $7,
                tngkt_pencapaian = $8,
                desk_pencapaian = $9,
                follow_up = $10,
                pendampingan_siswa = $11,
                keterangan = $12,
                guru_id = $13
            WHERE id = $14
            RETURNING *
            `,
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
                guruId,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Learning Reflection not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Update rpk_refleksi error:", err);
        res.status(500).json({ error: err.message });
    }
});


// DELETE
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
