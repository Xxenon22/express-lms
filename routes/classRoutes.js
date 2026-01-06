import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
/* ============================================
   GET Dashboard Kelas (Siswa)
============================================ */
router.get("/student/dashboard", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;

        /* ===============================
           1. Ambil semua kelas (GLOBAL)
        =============================== */
        const kelasQuery = `
            SELECT
                k.id,
                k.link_wallpaper_kelas,
                m.nama_mapel,
                u.username AS guru_name,
                u.photo_profile AS guru_photo
            FROM kelas k
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN users u ON k.guru_id = u.id
            ORDER BY k.id DESC
            LIMIT 100
        `;

        const { rows: kelasRows } = await pool.query(kelasQuery);

        /* ===============================
           2. Ambil kelas yang diikuti USER
        =============================== */
        const followedQuery = `
            SELECT kelas_id
            FROM kelas_diikuti
            WHERE user_id = $1
        `;

        const { rows: followedRows } = await pool.query(followedQuery, [userId]);

        /* ===============================
           3. Convert ke Set (SUPER CEPAT)
        =============================== */
        const followedSet = new Set(
            followedRows.map(r => r.kelas_id)
        );

        /* ===============================
           4. Pisahkan joined & other
        =============================== */
        const joined = [];
        const other = [];

        for (const row of kelasRows) {
            const kelas = {
                id: row.id,
                nama_mapel: row.nama_mapel,
                teacher: {
                    username: row.guru_name,
                    photo_profile: row.guru_photo
                },
                link_wallpaper_kelas: row.link_wallpaper_kelas
            };

            if (followedSet.has(row.id)) {
                joined.push(kelas);
            } else {
                other.push(kelas);
            }
        }

        res.json({ joined, other });

    } catch (err) {
        console.error("Error GET /student/dashboard:", err);
        res.status(500).json({ message: "Server error" });
    }
});


/* ============================================
   GET kelas diikuti user
============================================ */
router.get("/followed/me", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;

        const result = await pool.query(`
            SELECT kd.*, k.rombel_id, k.id_mapel, 
                   m.nama_mapel, 
                   u.username AS guru_name
            FROM kelas_diikuti kd
            INNER JOIN kelas k ON kd.kelas_id = k.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN users u ON k.guru_id = u.id
            WHERE kd.user_id = $1
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error GET /kelas/followed:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ============================================
   GET Siswa yang mengikuti kelas
============================================ */
router.get("/student/dashboard", verifyToken, async (req, res) => {
    try {
        const userId = Number(req.users.id);
        const page = Number(req.query.page || 1);
        const limit = 20;
        const offset = (page - 1) * limit;

        const [kelasRes, followedRes] = await Promise.all([
            pool.query(
                `
                SELECT
                    k.id,
                    k.link_wallpaper_kelas,
                    m.nama_mapel,
                    u.username AS guru_name,
                    u.photo_profile AS guru_photo
                FROM kelas k
                JOIN db_mapel m ON m.id = k.id_mapel
                JOIN users u ON u.id = k.guru_id
                ORDER BY k.id DESC
                LIMIT $1 OFFSET $2
                `,
                [limit, offset]
            ),
            pool.query(
                `
                SELECT kelas_id
                FROM kelas_diikuti
                WHERE user_id = $1
                `,
                [userId]
            )
        ]);

        const followedSet = new Set(
            followedRes.rows.map(r => r.kelas_id)
        );

        const joined = [];
        const other = [];

        for (const k of kelasRes.rows) {
            if (followedSet.has(k.id)) joined.push(k);
            else other.push(k);
        }

        res.json({ joined, other });

    } catch (err) {
        console.error("Dashboard error:", err);
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
                k.*, 
                nr.number AS name_rombel,
                g.grade_lvl,
                m.nama_mapel,
                mj.nama_jurusan AS major,
                u.username AS guru_name,
                u.photo_profile AS guru_photo
            FROM kelas k
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
            LEFT JOIN grade_level g ON r.grade_id = g.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
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

        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID format" });

        const q = `
            SELECT 
                k.id AS kelas_id, 
                k.link_wallpaper_kelas,
                m.nama_mapel, 

                nr.number AS name_rombel,
                gl.grade_lvl,
                mj.nama_jurusan AS major,

                u.username AS guru_name,
                u.photo_profile AS guru_photo,

                mp.id AS module_id,
                mp.judul AS module_judul,
                mp.judul_penugasan,
                mp.deskripsi,
                mp.video_url,
                mp.file_url,
                mp.created_at AS module_created_at,

                bs.id AS bank_soal_id,
                bs.judul_penugasan AS bank_soal_judul
            FROM kelas k
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
            LEFT JOIN grade_level gl ON r.grade_id = gl.id
            LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN users u ON k.guru_id = u.id
            LEFT JOIN module_pembelajaran mp ON mp.kelas_id = k.id
            LEFT JOIN bank_soal bs ON mp.bank_soal_id = bs.id
            WHERE k.id = $1
            ORDER BY mp.created_at DESC
        `;

        const { rows } = await pool.query(q, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Class not found" });
        }

        const kelasData = {
            kelas_id: rows[0].kelas_id,
            nama_mapel: rows[0].nama_mapel,
            name_rombel: rows[0].name_rombel,
            grade_lvl: rows[0].grade_lvl,
            major: rows[0].major,
            guru_name: rows[0].guru_name,
            guru_photo: rows[0].guru_photo,
            link_wallpaper_kelas: rows[0].link_wallpaper_kelas,
            modules: rows
                .filter(r => r.module_id)
                .map(r => ({
                    module_id: r.module_id,
                    judul: r.module_judul,
                    judul_penugasan: r.judul_penugasan,
                    deskripsi: r.deskripsi,
                    video_url: r.video_url,
                    file_url: r.file_url,
                    created_at: r.module_created_at,
                    bank_soal: r.bank_soal_id ? {
                        id: r.bank_soal_id,
                        judul: r.bank_soal_judul
                    } : null
                }))
        };

        res.status(200).json(kelasData);

    } catch (err) {
        console.error("Error GET /kelas/:id with modules:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


router.use((req, res, next) => {
    console.log(`[KELAS] ${req.method} ${req.originalUrl}`);
    next();
});
export default router;
