// routes/jawabanSiswaRoutes.js
import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// STORAGE CONFIGURATION (multer)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = "uploads/file-jawaban-siswa";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true }); // auto buat folder
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG, WEBP, and PDF files are allowed"), false);
        }
    },
});

router.post("/upload-multiple", verifyToken, upload.array("files"), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const { soal_id, bank_soal_id, materi_id } = req.body;
        const userId = req.users.id;

        // Pastikan id terisi atau null
        const soalId = soal_id || null;
        const bankSoalId = bank_soal_id || null;
        const materiId = materi_id || null;

        const savedFiles = [];

        for (const file of req.files) {
            const result = await pool.query(
                `INSERT INTO jawaban_siswa (user_id, soal_id, bank_soal_id, file_jawaban_siswa, created_at)
                 VALUES ($1,$2,$3,$4,NOW())
                 ON CONFLICT (user_id, soal_id) DO UPDATE
                 SET file_jawaban_siswa = EXCLUDED.file_jawaban_siswa,
                     created_at = NOW()
                 RETURNING *`,
                [userId, soalId, bankSoalId, file.filename]
            );

            savedFiles.push(result.rows[0]);
        }

        res.json({
            message: "Files uploaded successfully",
            files: req.files.map(f => f.filename),
            jawaban: savedFiles
        });
    } catch (err) {
        console.error("Error upload files:", err);
        res.status(500).json({ message: err.message });
    }
});


// SIMPAN JAWABAN (multiple soal)
router.post("/", verifyToken, async (req, res) => {
    try {
        const jawabanList = req.body; // array of jawaban
        const userId = req.users.id;

        if (!Array.isArray(jawabanList)) {
            return res.status(400).json({ message: "Answer must be an Array" });
        }

        const inserted = [];
        for (const j of jawabanList) {
            const result = await pool.query(
                `INSERT INTO jawaban_siswa (user_id, soal_id, bank_soal_id, jawaban, jawaban_essai, refleksi_siswa, file_jawaban_siswa, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
                 ON CONFLICT (user_id, soal_id) DO UPDATE
                 SET jawaban = EXCLUDED.jawaban,
                     jawaban_essai = EXCLUDED.jawaban_essai,
                     refleksi_siswa = EXCLUDED.refleksi_siswa,
                     file_jawaban_siswa = EXCLUDED.file_jawaban_siswa,
                     created_at = NOW()
                 RETURNING *`,
                [
                    userId,
                    j.soal_id,
                    j.bank_soal_id,
                    j.jawaban,
                    j.jawaban_essai,
                    j.refleksi_siswa,
                    j.file_jawaban_siswa || null,
                ]
            );
            inserted.push(result.rows[0]);
        }

        res.json({ message: "Answer saved successfully", data: inserted });
    } catch (err) {
        console.error("Error simpan jawaban:", err);
        res.status(500).json({ message: err.message });
    }
});

// AMBIL JAWABAN SISWA (by user login)
router.get("/", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;
        const result = await pool.query(
            `SELECT id, user_id, soal_id, bank_soal_id, jawaban, jawaban_essai, nilai, refleksi_siswa, file_jawaban_siswa, created_at
FROM jawaban_siswa WHERE user_id = $1`,
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetch jawaban:", err);
        res.status(500).json({ message: err.message });
    }
});


// GET jawaban siswa by bank_soal_id (assignment) untuk guru
router.get("/all", verifyToken, async (req, res) => {
    try {
        const { bank_soal_id } = req.query;

        if (!bank_soal_id) {
            return res.status(400).json({ message: "bank_soal_id required" });
        }

        // Ambil semua jawaban siswa untuk assignment ini
        const result = await pool.query(
            `SELECT js.*, u.username, u.photo_profiles_user
             FROM jawaban_siswa js
             JOIN users u ON u.id = js.user_id
             WHERE js.bank_soal_id = $1`,
            [bank_soal_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetch jawaban all:", err);
        res.status(500).json({ message: err.message });
    }
});

// UPDATE nilai siswa
router.put("/nilai", verifyToken, async (req, res) => {
    try {
        const { user_id, bank_soal_id, nilai } = req.body
        if (!user_id || !bank_soal_id || nilai === undefined) {
            return res.status(400).json({ message: "user_id, bank_soal_id, nilai required" })
        }

        const result = await pool.query(
            `UPDATE jawaban_siswa
             SET nilai = $1
             WHERE user_id = $2 AND bank_soal_id = $3
             RETURNING *`,
            [nilai, user_id, bank_soal_id]
        )

        res.json({ message: "Score updated sucessfully", data: result.rows[0] })
    } catch (err) {
        console.error("Error update nilai:", err)
        res.status(500).json({ message: err.message })
    }
})


// Ambil jawaban siswa + data soal
router.get("/all-with-soal", async (req, res) => {
    try {
        const { bank_soal_id } = req.query;

        if (!bank_soal_id) {
            return res.status(400).json({ message: "bank_soal_id wajib diisi" });
        }

        const result = await pool.query(
            `SELECT js.id AS jawaban_id,
                    js.user_id,
                    js.jawaban,
                    js.jawaban_essai,
                    js.refleksi_siswa,
                    js.nilai,
                    js.file_jawaban_siswa,
                    sp.id AS soal_id,
                    sp.pertanyaan,
                    sp.pg_a,
                    sp.pg_b,
                    sp.pg_c,
                    sp.pg_d,
                    sp.pg_e,
                    sp.kunci_jawaban,
                    sp.gambar,
                    sp.pertanyaan_essai,
                    sp.gambar_soal_essai
             FROM jawaban_siswa js
             LEFT JOIN soal_pilgan sp
             ON js.soal_id = sp.id
             WHERE js.bank_soal_id = $1`,
            [bank_soal_id]
        );


        const data = result.rows.map(r => ({
            ...r,
            url_file_jawaban: r.file_jawaban_siswa
                ? `${req.protocol}://${req.get("host")}/uploads/file-jawaban-siswa/${r.file_jawaban_siswa}`
                : null
        }));


        res.json(data);
    } catch (error) {
        console.error("Failed to retrieve answers and questions:", error);
        res.status(500).json({ message: "Failed to retrieve answers and questions" });
    }
});

// GET semua file jawaban siswa by bank_soal_id (bisa untuk guru)
router.get("/file/:bank_soal_id", verifyToken, async (req, res) => {
    try {
        const { bank_soal_id } = req.params;
        const queryUserId = req.query.user_id; // bisa dari guru (frontend)
        const userId = queryUserId || req.users.id; // fallback ke user login (siswa)

        const result = await pool.query(
            `SELECT id, file_jawaban_siswa, created_at
             FROM jawaban_siswa
             WHERE user_id = $1 AND bank_soal_id = $2
             ORDER BY created_at DESC`,
            [userId, bank_soal_id]
        );

        const files = result.rows.map(row => ({
            id: row.id,
            nama_file: row.file_jawaban_siswa,
            url: `${req.protocol}://${req.get("host")}/uploads/file-jawaban-siswa/${row.file_jawaban_siswa}`,
            created_at: row.created_at
        }));

        res.json(files);
    } catch (err) {
        console.error("Error fetch file jawaban:", err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE file jawaban siswa by id
router.delete("/file/:id", verifyToken, async (req, res) => {
    try {
        const userId = req.users.id;
        const { id } = req.params;

        // ambil data file dulu
        const check = await pool.query(
            `SELECT * FROM jawaban_siswa WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ message: "File not found or not yours" });
        }

        const fileName = check.rows[0].file_jawaban_siswa;
        const filePath = path.join("uploads/file-jawaban-siswa", fileName);

        // hapus di database
        await pool.query(`DELETE FROM jawaban_siswa WHERE id = $1 AND user_id = $2`, [id, userId]);

        // hapus file fisik kalau ada
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: "File deleted successfully" });
    } catch (err) {
        console.error("Error delete file:", err);
        res.status(500).json({ message: err.message });
    }
});

export default router;
