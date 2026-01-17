import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================
   GET kelas diikuti user
============================================ */
router.get("/followed/me", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;

        const { rows } = await pool.query(`
      SELECT
        k.id,
        m.nama_mapel,
        u.username AS guru_name,
        r.colab_class,
        gl.grade_lvl,
        mj.nama_jurusan AS major,
        nr.number AS name_rombel
      FROM kelas_diikuti kd
      JOIN kelas k ON kd.kelas_id = k.id
      LEFT JOIN db_mapel m ON k.id_mapel = m.id
      LEFT JOIN users u ON k.guru_id = u.id
      LEFT JOIN rombel r ON k.rombel_id = r.id
      LEFT JOIN grade_level gl ON r.grade_id = gl.id
      LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
      LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
      WHERE kd.user_id = $1
    `, [userId]);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.get("/student/dashboard", verifyToken, async (req, res) => {
    try {
        const userId = Number(req.users.id);

        const { rows } = await pool.query(`
      SELECT
        k.id,
        k.link_wallpaper_kelas,
        m.nama_mapel,

        u.id AS guru_id,
        u.username AS guru_name,
        u.photo_url AS guru_photo,

        r.colab_class,
        gl.grade_lvl,
        mj.nama_jurusan AS major,
        nr.number AS name_rombel,

        (kd.user_id IS NOT NULL) AS sudah_diikuti
      FROM kelas k
      LEFT JOIN db_mapel m ON k.id_mapel = m.id
      LEFT JOIN users u ON k.guru_id = u.id
      LEFT JOIN rombel r ON k.rombel_id = r.id
      LEFT JOIN grade_level gl ON r.grade_id = gl.id
      LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
      LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
      LEFT JOIN kelas_diikuti kd 
        ON kd.kelas_id = k.id AND kd.user_id = $1
      ORDER BY k.id DESC
    `, [userId]);

        const joined = [];
        const other = [];

        for (const row of rows) {
            const kelas = {
                id: row.id,
                link_wallpaper_kelas: row.link_wallpaper_kelas,
                nama_mapel: row.nama_mapel,
                guru_id: row.guru_id,
                guru_name: row.guru_name,
                guru_photo: row.guru_photo,
                rombel: {
                    type: row.colab_class ? "collab" : "regular",
                    grade_lvl: row.grade_lvl ?? null,
                    major: row.major ?? null,
                    name_rombel: row.name_rombel ?? null,
                    colab_class: row.colab_class ?? null
                },
                sudah_diikuti: row.sudah_diikuti
            };

            row.sudah_diikuti ? joined.push(kelas) : other.push(kelas);
        }

        res.json({ joined, other });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


/* ============================================
   FOLLOW kelas
============================================ */
router.post("/follow/:kelasId", verifyToken, async (req, res) => {
    try {
        const userId = Number(req.users.id);
        const kelasId = Number(req.params.kelasId);

        if (isNaN(userId) || isNaN(kelasId)) {
            return res.status(400).json({ error: "Invalid userId or kelasId" });
        }

        const cek = await pool.query(
            "SELECT 1 FROM kelas_diikuti WHERE user_id = $1 AND kelas_id = $2",
            [userId, kelasId]
        );

        if (cek.rows.length > 0) {
            return res.status(400).json({ error: "Already followed this class" });
        }

        const { rows } = await pool.query(
            `INSERT INTO kelas_diikuti (user_id, kelas_id)
             VALUES ($1, $2)
             RETURNING *`,
            [userId, kelasId]
        );

        res.status(201).json(rows[0]);

    } catch (err) {
        console.error("Error POST /kelas/follow:", err);
        res.status(500).json({ error: "Server error" });
    }
});


/* ============================================
   UNFOLLOW kelas
============================================ */
router.delete("/unfollow/:kelasId", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;
        const { kelasId } = req.params;

        const q = `
            DELETE FROM kelas_diikuti
            WHERE user_id = $1 AND kelas_id = $2
            RETURNING *
        `;

        const { rows } = await pool.query(q, [userId, kelasId]);

        if (rows.length === 0)
            return res.status(404).json({ error: "Not following this class" });

        res.json({ message: "Unfollowed", unfollow: rows[0] });

    } catch (err) {
        console.error("Error DELETE /kelas/unfollow:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ============================================
   GET All kelas (Guru)
============================================ */
router.get("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id;

        const result = await pool.query(`
            SELECT 
                k.id,
                k.link_wallpaper_kelas,
                
                nr.number AS name_rombel,
                g.grade_lvl,
                mj.nama_jurusan AS major,
                r.colab_class,

                m.nama_mapel,
                u.username AS guru_name,
                u.photo_url AS guru_photo
            FROM kelas k
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
            LEFT JOIN grade_level g ON r.grade_id = g.id
            LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN users u ON k.guru_id = u.id
            WHERE k.guru_id = $1
            ORDER BY k.id ASC

        `, [guruId]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error GET /kelas:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ============================================
   GET All kelas (Admin)
============================================ */
router.get("/:teacherId", verifyToken, async (req, res) => {
    try {
        const { teacherId } = req.users.id;

        const result = await pool.query(`
            SELECT 
                k.id,
                k.link_wallpaper_kelas,
                
                nr.number AS name_rombel,
                g.grade_lvl,
                mj.nama_jurusan AS major,
                r.colab_class,

                m.nama_mapel,
                u.username AS guru_name,
                u.photo_url AS guru_photo
            FROM kelas k
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
            LEFT JOIN grade_level g ON r.grade_id = g.id
            LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN users u ON k.guru_id = u.id
            WHERE k.guru_id = $1
            ORDER BY k.id ASC

        `, [teacherId]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error GET /kelas:", err);
        res.status(500).json({ error: "Server error" });
    }
});
/* ============================================
   CREATE kelas
============================================ */
router.post("/", verifyToken, async (req, res) => {
    try {
        const { rombel_id, link_wallpaper_kelas, id_mapel } = req.body;
        const guru_id = req.users.id;

        const wallpaper = link_wallpaper_kelas || "default_wallpaper.jpg";

        const q = `
            INSERT INTO kelas (guru_id, link_wallpaper_kelas, rombel_id, id_mapel)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const { rows } = await pool.query(q, [
            guru_id,
            wallpaper,
            rombel_id || null,
            id_mapel || null,
        ]);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error("Error POST /kelas:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ============================================
   GET siswa dalam kelas (UNTUK GURU)
============================================ */
router.get("/students/:kelasId", verifyToken, async (req, res) => {
    try {
        const { kelasId } = req.params;

        if (isNaN(kelasId)) {
            return res.status(400).json({ error: "Invalid kelasId" });
        }

        const { rows } = await pool.query(
            `
            SELECT
                u.id AS user_id,
                u.username AS name,
                u.photo_url
            FROM kelas_diikuti kd
            JOIN users u ON kd.user_id = u.id
            WHERE kd.kelas_id = $1
            ORDER BY u.username ASC
            `,
            [kelasId]
        );

        res.json(rows);
    } catch (err) {
        console.error("Error GET /kelas/students/:kelasId", err);
        res.status(500).json({ error: "Server error" });
    }
});


/* ============================================
   UPDATE kelas (COALESCE)
============================================ */
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { guru_id, link_wallpaper_kelas, rombel_id, id_mapel } = req.body;

        const q = `
            UPDATE kelas
            SET guru_id = COALESCE($1, guru_id),
                link_wallpaper_kelas = COALESCE($2, link_wallpaper_kelas),
                rombel_id = COALESCE($3, rombel_id),
                id_mapel = COALESCE($4, id_mapel)
            WHERE id = $5
            RETURNING *
        `;

        const { rows } = await pool.query(q, [
            guru_id || null,
            link_wallpaper_kelas || null,
            rombel_id || null,
            id_mapel || null,
            id,
        ]);

        if (rows.length === 0)
            return res.status(404).json({ error: "Class not found" });

        res.json(rows[0]);
    } catch (err) {
        console.error("Error PUT /kelas/:id:", err);
        res.status(500).json({ error: "Server error" });
    }
});


/* ============================================
   DELETE kelas
============================================ */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const q = "DELETE FROM kelas WHERE id = $1 RETURNING *";

        const { rows } = await pool.query(q, [id]);

        if (rows.length === 0)
            return res.status(404).json({ error: "Class not found" });

        res.json({ message: "Deleted", deleted: rows[0] });

    } catch (err) {
        console.error("Error DELETE /kelas/:id:", err);
        res.status(500).json({ error: "Server error" });
    }
});


/* ============================================
   GET Single kelas + modules
============================================ */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const { rows } = await pool.query(`        
        SELECT
            k.id AS kelas_id,
            k.link_wallpaper_kelas,
            m.nama_mapel,

            r.colab_class,
            gl.grade_lvl,
            mj.nama_jurusan AS major,
            nr.number AS name_rombel,

            u.username AS guru_name,
            u.photo_url AS guru_photo,

            mp.id AS module_id,
            mp.judul,
            mp.deskripsi,
            mp.video_url,
            mp.file_url,
            mp.created_at,
            mp.bank_soal_id

            FROM kelas k
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN grade_level gl ON r.grade_id = gl.id
            LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
            LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN users u ON k.guru_id = u.id
            LEFT JOIN module_pembelajaran mp ON mp.kelas_id = k.id
            WHERE k.id = $1
            ORDER BY mp.created_at DESC`,
            [id]);

        if (!rows.length) {
            return res.status(404).json({ error: "Class not found" });
        }

        const base = rows[0];

        res.json({
            kelas_id: base.kelas_id,
            nama_mapel: base.nama_mapel,
            guru_name: base.guru_name,
            guru_photo: base.guru_photo,
            link_wallpaper_kelas: base.link_wallpaper_kelas,
            rombel:
                base.colab_class || base.name_rombel
                    ? {
                        type: base.colab_class ? "collab" : "regular",
                        grade_lvl: base.grade_lvl ?? null,
                        major: base.major ?? null,
                        name_rombel: base.name_rombel ?? null,
                        colab_class: base.colab_class ?? null
                    }
                    : null,
            modules: rows
                .filter(r => r.module_id !== null)
                .map(r => ({
                    id: r.module_id,
                    kelas_id: r.kelas_id,
                    judul: r.judul,
                    deskripsi: r.deskripsi,
                    video_url: r.video_url,
                    file_url: r.file_url,
                    created_at: r.created_at,
                    bank_soal_id: r.bank_soal_id ?? null
                }))

        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.use((req, res, next) => {
    console.log(`[KELAS] ${req.method} ${req.originalUrl}`);
    next();
});
export default router;
