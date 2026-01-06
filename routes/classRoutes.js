import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================
   GET All kelas (Untuk siswa / admin)
============================================ */
router.get("/all/list", verifyToken, async (req, res) => {
    console.log("HIT /kelas/all/list");
    try {
        const q = `
            SELECT 
                k.id,
                k.link_wallpaper_kelas,
                k.guru_id,
                k.rombel_id,
                k.id_mapel,
                m.nama_mapel,
                nr.number AS name_rombel,
                g.grade_lvl,
                u.username AS guru_name,
                nj.nama_jurusan AS major,
                u.photo_profile AS guru_photo
            FROM kelas k
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
            LEFT JOIN grade_level g ON r.grade_id = g.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN jurusan nj ON r.jurusan_id = nj.id
            LEFT JOIN users u ON k.guru_id = u.id
            ORDER BY k.id ASC
        `;

        console.time("QUERY all kelas");
        const { rows } = await pool.query(q);
        console.timeEnd("QUERY all kelas");
        const formatted = rows.map(row => ({
            id: row.id,
            guru_id: row.guru_id,
            nama_mapel: row.nama_mapel,
            teacher: {
                username: row.guru_name,
                photo_profile: row.guru_photo
            },
            rombel: {
                id: row.rombel_id,
                name_rombel: row.name_rombel,
                grade_lvl: row.grade_lvl,
                major: row.major
            },
            link_wallpaper_kelas: row.link_wallpaper_kelas
        }));

        console.log("ROWS:", rows.length);
        res.json(formatted);
    } catch (err) {
        console.error("Error GET /kelas/all/list:", err);
        res.status(500).json({ error: "Server error" });
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
   FOLLOW kelas
============================================ */
router.post("/follow/:kelasId", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;
        const { kelasId } = req.params;

        const cek = await pool.query(
            "SELECT * FROM kelas_diikuti WHERE user_id = $1 AND kelas_id = $2",
            [userId, kelasId]
        );

        if (cek.rows.length > 0) {
            return res.status(400).json({ error: "Already followed this class" });
        }

        const q = `
            INSERT INTO kelas_diikuti (user_id, kelas_id)
            VALUES ($1, $2)
            RETURNING *
        `;

        const { rows } = await pool.query(q, [userId, kelasId]);

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
   GET Siswa yang mengikuti kelas
============================================ */
router.get("/students/:kelasId", verifyToken, async (req, res) => {
    try {
        const { kelasId } = req.params;

        const query = `
            SELECT 
                kd.user_id,
                u.username AS name,
                u.photo_profile
            FROM kelas_diikuti kd
            JOIN users u ON u.id = kd.user_id
            WHERE kd.kelas_id = $1
            ORDER BY u.username ASC
        `;

        const { rows } = await pool.query(query, [kelasId]);
        res.json(rows);

    } catch (err) {
        console.error("Error GET /kelas/students/:kelasId:", err);
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

export default router;
