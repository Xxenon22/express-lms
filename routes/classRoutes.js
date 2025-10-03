import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all kelas
router.get("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id;
        const result = await pool.query(`
      SELECT 
        k.*, 
        r.name_rombel, 
        g.grade_lvl, 
        m.nama_mapel,
        u.username AS guru_name,
        u.photo_profiles_user AS guru_photo
      FROM kelas k
      LEFT JOIN rombel r ON k.rombel_id = r.id
      LEFT JOIN grade_level g ON r.grade_id = g.id
      LEFT JOIN db_mapel m ON k.id_mapel = m.id
      LEFT JOIN users u ON k.guru_id = u.id
      WHERE k.guru_id = $1
      ORDER BY k.id ASC`,
            [guruId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error GET /kelas:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET single kelas by ID + module pembelajaran
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Validasi ID harus angka
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        const q = `
            SELECT 
                k.id AS kelas_id, 
                k.link_wallpaper_kelas,
                m.nama_mapel, 
                r.name_rombel, 
                gl.grade_lvl,
                u.username AS guru_name,
                u.photo_profiles_user AS guru_photo,
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
            LEFT JOIN grade_level gl ON r.grade_id = gl.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN users u ON k.guru_id = u.id
            LEFT JOIN module_pembelajaran mp ON mp.kelas_id = k.id
            LEFT JOIN bank_soal bs ON mp.bank_soal_id = bs.id
            WHERE k.id = $1
            ORDER BY mp.created_at DESC
        `;

        const { rows } = await pool.query(q, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Kelas not found" });
        }

        // Format biar hasilnya rapi (1 kelas punya banyak module)
        const kelasData = {
            kelas_id: rows[0].kelas_id,
            nama_mapel: rows[0].nama_mapel,
            name_rombel: rows[0].name_rombel,
            grade_lvl: rows[0].grade_lvl,
            guru_name: rows[0].guru_name,
            guru_photo: rows[0].guru_photo,
            link_wallpaper_kelas: rows[0].link_wallpaper_kelas,
            modules: rows
                .filter(r => r.module_id) // ambil hanya kalau ada module
                .map(r => ({
                    module_id: r.module_id,
                    judul: r.module_judul,
                    judul_penugasan: r.judul_penugasan,
                    deskripsi: r.deskripsi,
                    video_url: r.video_url,
                    file_url: r.file_url,
                    created_at: r.module_created_at,
                    bank_soal: r.bank_soal_id
                        ? {
                            id: r.bank_soal_id,
                            judul: r.bank_soal_judul
                        }
                        : null
                }))
        };
        console.log("Query rows:", rows);

        res.status(200).json(kelasData);

    } catch (err) {
        console.error("Error GET /kelas/:id with modules:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// CREATE kelas
router.post("/", verifyToken, async (req, res) => {
    try {
        const { rombel_id, link_wallpaper_kelas, id_mapel } = req.body;
        const guru_id = req.user.id;
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

// UPDATE kelas
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
            return res.status(404).json({ error: "Kelas not found" });
        res.json(rows[0]);
    } catch (err) {
        console.error("Error PUT /kelas/:id:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// DELETE kelas
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const q = "DELETE FROM kelas WHERE id = $1 RETURNING *";
        const { rows } = await pool.query(q, [id]);
        if (rows.length === 0)
            return res.status(404).json({ error: "Kelas not found" });
        res.json({ message: "Deleted", deleted: rows[0] });
    } catch (err) {
        console.error("Error DELETE /kelas/:id:", err);
        res.status(500).json({ error: "Server error" });
    }
});


// GET semua kelas (untuk admin / siswa browsing)
router.get("/all/list", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                k.*, 
                r.name_rombel, 
                g.grade_lvl, 
                m.nama_mapel,
                u.username AS guru_name
            FROM kelas k
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN grade_level g ON r.grade_id = g.id
            LEFT JOIN db_mapel m ON k.id_mapel = m.id
            LEFT JOIN users u ON k.guru_id = u.id
            ORDER BY k.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("Error GET /kelas/all/list:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// GET kelas yang diikuti oleh user
router.get("/followed/me", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;
        const result = await pool.query(`
            SELECT kd.*, k.rombel_id, k.id_mapel, m.nama_mapel, u.username AS guru_name
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

// Follow kelas
router.post("/follow/:kelasId", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;
        const { kelasId } = req.params;

        // cek apakah sudah ada
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

// Unfollow kelas
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

        if (rows.length === 0) return res.status(404).json({ error: "Not following this class" });

        res.json({ message: "Unfollowed", unfollow: rows[0] });
    } catch (err) {
        console.error("Error DELETE /kelas/unfollow:", err);
        res.status(500).json({ error: "Server error" });
    }

});

// Ambil semua siswa yang mengikuti kelas tertentu
router.get("/students/:kelasId", verifyToken, async (req, res) => {
    try {
        const { kelasId } = req.params;

        const query = `
            SELECT 
                kd.user_id,
                u.username AS name,
                u.photo_profiles_user
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


export default router;
