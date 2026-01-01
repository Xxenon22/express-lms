import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();

/* ================= MULTER ================= */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allow = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ];
        allow.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error("File not allowed"), false);
    }
});

/* ================= SIMPAN JAWABAN ================= */
router.post("/", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;
        const data = req.body;

        const r = await pool.query(
            `INSERT INTO jawaban_siswa
             (user_id, soal_id, bank_soal_id, jawaban, jawaban_essai, refleksi_siswa)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING *`,
            [
                userId,
                data.soal_id,
                data.bank_soal_id,
                data.jawaban,
                data.jawaban_essai,
                data.refleksi_siswa
            ]
        );

        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
    }
});

/* ================= UPLOAD FILE ================= */
router.post(
    "/files",
    verifyToken,
    upload.array("files"),
    async (req, res) => {
        try {
            const userId = req.users.id;
            const { jawaban_siswa_id, bank_soal_id } = req.body;

            const saved = [];

            for (const file of req.files) {
                const r = await pool.query(
                    `INSERT INTO jawaban_siswa_files
                     (jawaban_siswa_id, user_id, bank_soal_id, file_data, file_name, file_mime)
                     VALUES ($1,$2,$3,$4,$5,$6)
                     RETURNING id, file_name, file_mime, created_at`,
                    [
                        jawaban_siswa_id,
                        userId,
                        bank_soal_id,
                        file.buffer,
                        file.originalname,
                        file.mimetype
                    ]
                );

                saved.push({
                    ...r.rows[0],
                    url: `${req.protocol}://${req.get("host")}/api/jawaban-siswa/files/${r.rows[0].id}`
                });
            }

            res.json(saved);
        } catch (e) {
            console.error(e);
            res.status(500).json({ message: e.message });
        }
    }
);

/* ================= AMBIL FILE ================= */
router.get("/files/:id", async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT file_data, file_mime, file_name
             FROM jawaban_siswa_files
             WHERE id = $1`,
            [req.params.id]
        );

        if (!r.rows.length) return res.sendStatus(404);

        res.setHeader("Content-Type", r.rows[0].file_mime);
        res.setHeader("Content-Disposition", "inline");
        res.send(r.rows[0].file_data);
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed");
    }
});

/* ================= FILE BY BANK SOAL ================= */
router.get("/files-by-bank/:bank_soal_id", verifyToken, async (req, res) => {
    const userId = req.users.id;

    const r = await pool.query(
        `SELECT id, file_name, file_mime, created_at
         FROM jawaban_siswa_files
         WHERE bank_soal_id = $1 AND user_id = $2
         ORDER BY created_at DESC`,
        [req.params.bank_soal_id, userId]
    );

    res.json(
        r.rows.map(f => ({
            ...f,
            url: `${req.protocol}://${req.get("host")}/api/jawaban-siswa/files/${f.id}`
        }))
    );
});

export default router;
