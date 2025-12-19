import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===========================
// GET ALL RPK (FILTER BY GURU ID)
// ===========================
router.get("/all-rpk/:id", verifyToken, async (req, res) => {
    try {
        const guruId = req.params.id;

        const result = await pool.query(`
      SELECT 
        rpk.*,
        r.name_rombel,
        g.grade_lvl AS name_grade,
        dm.nama_mapel AS subject,
        p.phase,
        t.username AS teacher_name,
        i.name AS instructor_name,
        m.nama_jurusan AS major
      FROM rpk_db rpk
      LEFT JOIN rombel r ON rpk.rombel_id = r.id
      LEFT JOIN kelas k ON k.id = rpk.kelas_id
      LEFT JOIN db_mapel dm ON dm.id = k.id_mapel
      LEFT JOIN grade_level g ON r.grade_id = g.id
      LEFT JOIN jurusan m ON r.jurusan_id = m.id
      LEFT JOIN db_phase p ON rpk.phase_id = p.id
      LEFT JOIN users t ON rpk.guru_id = t.id
      LEFT JOIN db_guru i ON rpk.instructor = i.id
      WHERE rpk.guru_id = $1
      ORDER BY rpk.created_at DESC
    `, [guruId]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetch all Learning Plan:", err);
        res.status(500).json({ error: err.message });
    }
});

// ===========================
// GET DETAIL RPK BY ID
// ===========================
router.get("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT 
        rpk.id,
        rpk.rombel_id,
        rpk.phase_id,
        rpk.guru_id,
        rpk.instructor,
        rpk.tutor,
        rpk.hari_tanggal,
        rpk.waktu,
        rpk.tujuan_pembelajaran,
        rpk.lintas_disiplin_ilmu,
        rpk.pemanfaatan_digital,
        rpk.kemitraan_pembelajaran,
        rpk.dpl_1, rpk.dpl_2, rpk.dpl_3, rpk.dpl_4,
        rpk.dpl_5, rpk.dpl_6, rpk.dpl_7, rpk.dpl_8,
        r.name_rombel,
        dm.nama_mapel AS subject,  -- ✅ ambil subject dari kelas
        g.grade_lvl,
        p.phase,
        t.username AS teacher_name,
        i.name AS instructor_name,
        m.nama_jurusan AS major,
        mem.memahami,
        mem.asesmen_memahami,
        mem.berkesadaran AS memahami_berkesadaran,
        mem.bermakna AS memahami_bermakna,
        mem.menggembirakan AS memahami_menggembirakan,
        ma.mengaplikasikan,
        ma.asesmen_mengaplikasikan,
        ma.berkesadaran AS mengaplikasikan_berkesadaran,
        ma.bermakna AS mengaplikasikan_bermakna,
        ma.menggembirakan AS mengaplikasikan_menggembirakan,
        me.merefleksi,
        me.asesmen_merefleksi,
        me.berkesadaran AS merefleksi_berkesadaran,
        me.bermakna AS merefleksi_bermakna,
        me.menggembirakan AS merefleksi_menggembirakan
      FROM rpk_db rpk
      LEFT JOIN rombel r ON rpk.rombel_id = r.id
      LEFT JOIN kelas k ON k.id = rpk.kelas_id
      LEFT JOIN db_mapel dm ON dm.id = k.id_mapel
      LEFT JOIN grade_level g ON r.grade_id = g.id
      LEFT JOIN jurusan m ON r.jurusan_id = m.id
      LEFT JOIN db_phase p ON rpk.phase_id = p.id
      LEFT JOIN users t ON rpk.guru_id = t.id
      LEFT JOIN db_guru i ON rpk.instructor = i.id
      LEFT JOIN rpk_memahami mem ON rpk.memahami_id = mem.id
      LEFT JOIN rpk_mengaplikasikan ma ON rpk.mengaplikasikan_id = ma.id
      LEFT JOIN rpk_merefleksi me ON rpk.merefleksi_id = me.id
      WHERE rpk.id = $1
      LIMIT 1
    `, [id]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error get detail RPK:", error);
        res.status(500).json({ message: "Internal Server error" });
    }
});


// ===========================
// CREATE (hapus mapel_id)
// ===========================
router.post("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id;
        const {
            tutor, hari_tanggal, waktu, tujuan_pembelajaran,
            lintas_disiplin_ilmu, pemanfaatan_digital,
            kemitraan_pembelajaran,
            dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
            phase_id, rombel_id, kelas_id, instructor,
            memahami_id, mengaplikasikan_id, merefleksi_id
        } = req.body;

        const result = await pool.query(`
      INSERT INTO rpk_db (
        tutor, hari_tanggal, waktu, tujuan_pembelajaran,
        lintas_disiplin_ilmu, pemanfaatan_digital, kemitraan_pembelajaran,
        dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
        phase_id, rombel_id, kelas_id, guru_id, instructor,
        memahami_id, mengaplikasikan_id, merefleksi_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23
      )
      RETURNING *
    `, [
            tutor, hari_tanggal, waktu, tujuan_pembelajaran,
            lintas_disiplin_ilmu, pemanfaatan_digital, kemitraan_pembelajaran,
            dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
            phase_id, rombel_id, kelas_id, guruId, instructor,
            memahami_id, mengaplikasikan_id, merefleksi_id
        ]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error create RPK:", err);
        res.status(500).json({ error: err.message });
    }
});


// ===========================
// UPDATE (hapus mapel_id juga)
// ===========================
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            tutor, hari_tanggal, waktu, tujuan_pembelajaran,
            lintas_disiplin_ilmu, pemanfaatan_digital, kemitraan_pembelajaran,
            dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
            phase_id, rombel_id, guru_id, instructor,
            memahami_id, mengaplikasikan_id, merefleksi_id, kelas_id
        } = req.body;

        const updateQuery = `
      UPDATE rpk_db 
      SET tutor = COALESCE($1, tutor),
          hari_tanggal = COALESCE($2, hari_tanggal),
          waktu = COALESCE($3, waktu),
          tujuan_pembelajaran = COALESCE($4, tujuan_pembelajaran),
          lintas_disiplin_ilmu = COALESCE($5, lintas_disiplin_ilmu),
          pemanfaatan_digital = COALESCE($6, pemanfaatan_digital),
          kemitraan_pembelajaran = COALESCE($7, kemitraan_pembelajaran),
          dpl_1 = COALESCE($8, dpl_1),
          dpl_2 = COALESCE($9, dpl_2),
          dpl_3 = COALESCE($10, dpl_3),
          dpl_4 = COALESCE($11, dpl_4),
          dpl_5 = COALESCE($12, dpl_5),
          dpl_6 = COALESCE($13, dpl_6),
          dpl_7 = COALESCE($14, dpl_7),
          dpl_8 = COALESCE($15, dpl_8),
          phase_id = COALESCE($16, phase_id),
          rombel_id = COALESCE($17, rombel_id),
          guru_id = COALESCE($18, guru_id),
          instructor = COALESCE($19, instructor),
          memahami_id = COALESCE($20, memahami_id),
          mengaplikasikan_id = COALESCE($21, mengaplikasikan_id),
          merefleksi_id = COALESCE($22, merefleksi_id),
          kelas_id = COALESCE($23, kelas_id)
      WHERE id = $24
      RETURNING *;
    `;

        const result = await pool.query(updateQuery, [
            tutor, hari_tanggal, waktu, tujuan_pembelajaran,
            lintas_disiplin_ilmu, pemanfaatan_digital, kemitraan_pembelajaran,
            dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
            phase_id, rombel_id, guru_id, instructor,
            memahami_id, mengaplikasikan_id, merefleksi_id, kelas_id, id
        ]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating RPK:", err);
        res.status(500).json({ error: err.message });
    }
});


// ===========================
// DELETE
// ===========================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM rpk_db WHERE id = $1`, [id]);
        res.json({ message: "Learning Plan deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
