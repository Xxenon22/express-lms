// routes/progressRoutes.js
import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Simpan / update progress
router.post("/", verifyToken, async (req, res) => {
    try {
        console.log("BODY yang dikirim:", req.body);

        const { materi_id, video_selesai, pdf_selesai, langkah_aktif, refleksi } = req.body;
        const userId = req.users.id;

        // Tentukan otomatis apakah status selesai
        const status_selesai =
            langkah_aktif === "4" && video_selesai === true && pdf_selesai === true;

        const result = await pool.query(
            `INSERT INTO progress_materi (user_id, materi_id, video_selesai, pdf_selesai, langkah_aktif, refleksi, status_selesai, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
             ON CONFLICT (user_id, materi_id) DO UPDATE
             SET video_selesai  = EXCLUDED.video_selesai,
                 pdf_selesai    = EXCLUDED.pdf_selesai,
                 langkah_aktif  = EXCLUDED.langkah_aktif,
                 refleksi       = EXCLUDED.refleksi,
                 status_selesai = EXCLUDED.status_selesai,
                 updated_at     = NOW()
             RETURNING *`,
            [userId, materi_id, video_selesai, pdf_selesai, langkah_aktif, refleksi, status_selesai]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error simpan progress:", err);
        res.status(500).json({ message: err.message });
    }
});

router.get("/:userId", verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT
                p.*,
                u.photo_profile AS user_photo
                FROM progress_materi 
                JOIN users u ON p.user_id = u.id
             WHERE user_id = $1`,
            [userId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("GET /progress-materi/:userId error:", err);
        res.status(500).json({ message: "Failed to retrieve material progress" });
    }
});

export default router;
