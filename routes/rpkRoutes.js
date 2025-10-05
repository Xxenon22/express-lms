import express from "express";
import { pool } from "../config/db.js";
const router = express.Router();
import { verifyToken } from "../middleware/authMiddleware.js";

// GET ALL RPK but Filter BY TEACHER ID
router.get("/all-rpk/:id", verifyToken, async (req, res) => {
    try {
        const guruId = req.params.id;
        const result = await pool.query(`
    SELECT 
        rpk.*,
        r.name_rombel,
        g.grade_lvl AS name_grade,
        m.nama_mapel,
        p.phase,
        t.username AS teacher_name,
        i.name AS instructor_name,
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
    LEFT JOIN db_mapel m ON rpk.mapel_id = m.id
    LEFT JOIN rombel r ON rpk.rombel_id = r.id
    LEFT JOIN grade_level g ON r.grade_id = g.id
    LEFT JOIN db_phase p ON rpk.phase_id = p.id
    LEFT JOIN users t ON rpk.guru_id = t.id
    LEFT JOIN db_guru i ON rpk.instructor = i.id
    LEFT JOIN rpk_memahami mem ON rpk.memahami_id = mem.id
    LEFT JOIN rpk_mengaplikasikan ma ON rpk.mengaplikasikan_id = ma.id
    LEFT JOIN rpk_merefleksi me ON rpk.merefleksi_id = me.id
    WHERE rpk.guru_id = $1
`, [guruId]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetch all RPK :", err);
        res.status(500).json({ error: err.message });
    }
});

// GET detail RPK by id
router.get("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
      SELECT 
    rpk.id,
    rpk.rombel_id,
    rpk.mapel_id,
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
    m.nama_mapel,
    r.name_rombel,
    g.grade_lvl,
    p.phase,
    t.username AS teacher_name,
    i.name AS instructor_name,
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
JOIN db_mapel m ON rpk.mapel_id = m.id
JOIN rombel r ON rpk.rombel_id = r.id
JOIN grade_level g ON r.grade_id = g.id
JOIN db_phase p ON rpk.phase_id = p.id
LEFT JOIN users t ON rpk.guru_id = t.id
LEFT JOIN db_guru i ON rpk.instructor = i.id
LEFT JOIN rpk_memahami mem ON rpk.memahami_id = mem.id
LEFT JOIN rpk_mengaplikasikan ma ON rpk.mengaplikasikan_id = ma.id
LEFT JOIN rpk_merefleksi me ON rpk.merefleksi_id = me.id
WHERE rpk.id = $1
LIMIT 1

    `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "RPK tidak ditemukan" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error get detail RPK:", error);
        res.status(500).json({ message: "Terjadi kesalahan server" });
    }
});

// CREATE
router.post("/", async (req, res) => {
    try {
        const {
            tutor, hari_tanggal, waktu, tujuan_pembelajaran,
            lintas_disiplin_ilmu, pemanfaatan_digital,
            kemitraan_pembelajaran,
            dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
            phase_id, rombel_id, guru_id, instructor, mapel_id,
            memahami_id, mengaplikasikan_id, merefleksi_id
        } = req.body;

        const result = await pool.query(
            `INSERT INTO rpk_db 
      (tutor, hari_tanggal, waktu, tujuan_pembelajaran,
      lintas_disiplin_ilmu, pemanfaatan_digital, kemitraan_pembelajaran,
      dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
      phase_id, rombel_id, guru_id, instructor, mapel_id,
      memahami_id, mengaplikasikan_id, merefleksi_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,
              $8,$9,$10,$11,$12,$13,$14,$15,
              $16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *`,
            [tutor, hari_tanggal, waktu, tujuan_pembelajaran,
                lintas_disiplin_ilmu, pemanfaatan_digital, kemitraan_pembelajaran,
                dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
                phase_id, rombel_id, guru_id, instructor, mapel_id,
                memahami_id, mengaplikasikan_id, merefleksi_id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            tutor, hari_tanggal, waktu, tujuan_pembelajaran,
            lintas_disiplin_ilmu, pemanfaatan_digital, kemitraan_pembelajaran,
            dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
            phase_id, rombel_id, guru_id, instructor, mapel_id,

            // pengalaman belajar (child)
            memahami, asesmenMemahami, berkesadaranMemahami, bermaknaMemahami, menggembirakanMemahami,
            mengaplikasikan, asesmenMengaplikasikan, berkesadaranMengaplikasikan, bermaknaMengaplikasikan, menggembirakanMengaplikasikan,
            merefleksi, asesmenMerefleksi, berkesadaranMerefleksi, bermaknaMerefleksi, menggembirakanMerefleksi,

            // id child jika ada
            currentMemahamiId,
            currentMengaplikasikanId,
            currentMerefleksiId
        } = req.body;

        // === Update child table: memahami ===
        let memahami_id = currentMemahamiId;
        if (memahami_id) {
            await pool.query(
                `UPDATE rpk_memahami 
                 SET memahami=$1, asesmen_memahami=$2, berkesadaran=$3, bermakna=$4, menggembirakan=$5
                 WHERE id=$6`,
                [memahami, asesmenMemahami, berkesadaranMemahami, bermaknaMemahami, menggembirakanMemahami, memahami_id]
            );
        } else {
            const memRes = await pool.query(
                `INSERT INTO rpk_memahami (memahami, asesmen_memahami, berkesadaran, bermakna, menggembirakan)
                 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [memahami, asesmenMemahami, berkesadaranMemahami, bermaknaMemahami, menggembirakanMemahami]
            );
            memahami_id = memRes.rows[0].id;
        }

        // === Update child table: mengaplikasikan ===
        let mengaplikasikan_id = currentMengaplikasikanId;
        if (mengaplikasikan_id) {
            await pool.query(
                `UPDATE rpk_mengaplikasikan 
                 SET mengaplikasikan=$1, asesmen_mengaplikasikan=$2, berkesadaran=$3, bermakna=$4, menggembirakan=$5
                 WHERE id=$6`,
                [mengaplikasikan, asesmenMengaplikasikan, berkesadaranMengaplikasikan, bermaknaMengaplikasikan, menggembirakanMengaplikasikan, mengaplikasikan_id]
            );
        } else {
            const applRes = await pool.query(
                `INSERT INTO rpk_mengaplikasikan (mengaplikasikan, asesmen_mengaplikasikan, berkesadaran, bermakna, menggembirakan)
                 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [mengaplikasikan, asesmenMengaplikasikan, berkesadaranMengaplikasikan, bermaknaMengaplikasikan, menggembirakanMengaplikasikan]
            );
            mengaplikasikan_id = applRes.rows[0].id;
        }

        // === Update child table: merefleksi ===
        let merefleksi_id = currentMerefleksiId;
        if (merefleksi_id) {
            await pool.query(
                `UPDATE rpk_merefleksi 
                 SET merefleksi=$1, asesmen_merefleksi=$2, berkesadaran=$3, bermakna=$4, menggembirakan=$5
                 WHERE id=$6`,
                [merefleksi, asesmenMerefleksi, berkesadaranMerefleksi, bermaknaMerefleksi, menggembirakanMerefleksi, merefleksi_id]
            );
        } else {
            const reflRes = await pool.query(
                `INSERT INTO rpk_merefleksi (merefleksi, asesmen_merefleksi, berkesadaran, bermakna, menggembirakan)
                 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [merefleksi, asesmenMerefleksi, berkesadaranMerefleksi, bermaknaMerefleksi, menggembirakanMerefleksi]
            );
            merefleksi_id = reflRes.rows[0].id;
        }

        // === Update parent RPK (gunakan COALESCE agar FK tidak jadi NULL) ===
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
                mapel_id = COALESCE($20, mapel_id),
                memahami_id = COALESCE($21, memahami_id),
                mengaplikasikan_id = COALESCE($22, mengaplikasikan_id),
                merefleksi_id = COALESCE($23, merefleksi_id)
            WHERE id = $24
            RETURNING *;
        `;

        const result = await pool.query(updateQuery, [
            tutor, hari_tanggal, waktu, tujuan_pembelajaran,
            lintas_disiplin_ilmu, pemanfaatan_digital, kemitraan_pembelajaran,
            dpl_1, dpl_2, dpl_3, dpl_4, dpl_5, dpl_6, dpl_7, dpl_8,
            phase_id, rombel_id, guru_id, instructor, mapel_id,
            memahami_id, mengaplikasikan_id, merefleksi_id, id
        ]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating RPK:", err);
        res.status(500).json({ error: err.message });
    }
});


// DELETE
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM rpk_db WHERE id = $1`, [id]);
        res.json({ message: "RPK deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
