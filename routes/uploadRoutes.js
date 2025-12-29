import express from "express";
import multer from "multer";
import { pool } from "../config/db.js"; // sesuaikan koneksi PG kamu

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }
    }
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
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            url: `/api/module-pembelajaran/${result.rows[0].id}/download`
        });
    } catch (err) {
        console.error("UPLOAD PDF ERROR:", err);
        res.status(500).json({ message: "Failed to upload PDF" });
    }
});

router.get("/:id/download", async (req, res) => {
    const result = await pool.query(
        "SELECT file_name, file_mime, file_pdf FROM module_pembelajaran WHERE id=$1",
        [req.params.id]
    );
    if (!result.rows.length) return res.status(404).send("File not found");
    const file = result.rows[0];
    res.setHeader("Content-Type", file.file_mime);
    res.setHeader("Content-Disposition", `attachment; filename="${file.file_name}"`);
    res.send(file.file_pdf);
});

export default router;
