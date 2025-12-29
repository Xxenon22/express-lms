import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();

/* =======================
   MULTER (PDF MEMORY)
======================= */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        file.mimetype === "application/pdf"
            ? cb(null, true)
            : cb(new Error("Only PDF allowed"), false);
    }
});

/* =======================
   GURU
======================= */

// GET module by guru
router.get("/guru", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id;
        const { rows } = await pool.query(
            `SELECT * FROM module_pembelajaran
             WHERE guru_id = $1
             ORDER BY created_at DESC`,
            [guruId]
        );
        res.json(rows);
    } catch (err) {
        console.error("GET module guru:", err);
        res.status(500).json({ message: "Failed fetch module guru" });
    }
});

// POST module (UPLOAD PDF)
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
    try {
        const {
            judul,
            video_url,
            deskripsi,
            bank_soal_id,
            judul_penugasan,
            link_zoom,
            kelas_id,
            pass_code
        } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "PDF file required" });
        }

        const result = await pool.query(
            `INSERT INTO module_pembelajaran (
                judul, video_url, deskripsi, guru_id,
                bank_soal_id, judul_penugasan,
                link_zoom, kelas_id, pass_code,
                file_pdf, file_name, file_mime
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
            ) RETURNING *`,
            [
                judul,
                video_url,
                deskripsi,
                req.users.id,
                bank_soal_id,
                judul_penugasan,
                link_zoom,
                kelas_id,
                pass_code,
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            ]
        );

        console.log("PDF UPLOADED:", {
            name: req.file.originalname,
            size: req.file.size
        });

        res.json(result.rows[0]);
    } catch (err) {
        console.error("POST module:", err);
        res.status(500).json({ message: "Failed create module" });
    }
});

/* =======================
   SISWA
======================= */

// GET module siswa
router.get("/siswa/:siswaId", verifyToken, async (req, res) => {
    try {
        const { siswaId } = req.params;

        const { rows } = await pool.query(`
            SELECT 
                mp.id,
                mp.judul_penugasan,
                mp.kelas_id,
                mp.bank_soal_id,
                r.name_rombel,
                m.nama_mapel,
                p.pdf_selesai,
                p.video_selesai,
                j.nilai,
                u.photo_profile AS guru_foto
            FROM module_pembelajaran mp
            JOIN kelas k ON k.id = mp.kelas_id
            JOIN rombel r ON r.id = k.rombel_id
            JOIN db_mapel m ON m.id = k.id_mapel
            JOIN kelas_diikuti kd ON kd.kelas_id = k.id
            LEFT JOIN users u ON u.id = mp.guru_id
            LEFT JOIN progress_materi p 
                ON p.materi_id = mp.id AND p.user_id = $1
            LEFT JOIN jawaban_siswa j 
                ON j.bank_soal_id = mp.bank_soal_id AND j.user_id = $1
            WHERE kd.user_id = $1
            ORDER BY mp.created_at DESC
        `, [siswaId]);

        res.json(rows);
    } catch (err) {
        console.error("GET module siswa:", err);
        res.status(500).json({ message: "Failed fetch module siswa" });
    }
});

/* =======================
   KELAS
======================= */

router.get("/kelas/:kelasId", verifyToken, async (req, res) => {
    try {
        const { kelasId } = req.params;
        const { rows } = await pool.query(
            `SELECT id, kelas_id, judul_penugasan, bank_soal_id, created_at
             FROM module_pembelajaran
             WHERE kelas_id = $1
             ORDER BY created_at DESC`,
            [kelasId]
        );
        res.json(rows);
    } catch (err) {
        console.error("GET module kelas:", err);
        res.status(500).json({ message: "Failed fetch module kelas" });
    }
});

/* =======================
   DETAIL & FILE
======================= */

// GET detail module
router.get("/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { rows } = await pool.query(
        `SELECT * FROM module_pembelajaran WHERE id=$1`,
        [id]
    );

    if (!rows.length) {
        return res.status(404).json({ message: "Module not found" });
    }

    res.json(rows[0]);
});

// STREAM PDF
router.get("/:id/pdf", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { rows } = await pool.query(
        `SELECT file_pdf, file_name, file_mime
         FROM module_pembelajaran WHERE id=$1`,
        [id]
    );

    if (!rows.length) {
        return res.status(404).json({ message: "PDF not found" });
    }

    res.setHeader("Content-Type", rows[0].file_mime);
    res.setHeader(
        "Content-Disposition",
        `inline; filename="${rows[0].file_name}"`
    );

    res.send(rows[0].file_pdf);
});

/* =======================
   DELETE
======================= */

router.delete("/:id", verifyToken, async (req, res) => {
    await pool.query("DELETE FROM module_pembelajaran WHERE id=$1", [
        req.params.id
    ]);
    res.json({ message: "Module deleted" });
});

export default router;
