import express from "express";
import multer from "multer";
import { pool } from "../config/db.js"; // sesuaikan koneksi PG kamu

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});

// upload pdf → langsung ke DB
router.post("/", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { originalname, mimetype, buffer } = req.file;

        // contoh simpan ke tabel module_pembelajaran
        const result = await pool.query(
            `
      INSERT INTO module_pembelajaran (file_pdf, file_name, file_mime)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
            [buffer, originalname, mimetype]
        );

        res.json({
            message: "PDF saved to database",
            module_id: result.rows[0].id,
        });
    } catch (err) {
        console.error("UPLOAD PDF ERROR:", err);
        res.status(500).json({ message: "Failed to upload PDF" });
    }
});

export default router;
