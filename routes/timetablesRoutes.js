import express from "express";
import multer from "multer";
import { pool } from "../config/db.js";

const router = express.Router();

/**
 * Multer config (PDF only, memory)
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter(req, file, cb) {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }
    }
});

/**
 * CREATE - Upload PDF
 */
router.post("/", upload.single("jadwal"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "PDF file is required" });
        }

        const { originalname, buffer, mimetype } = req.file;

        const result = await pool.query(
            `INSERT INTO jadwal_db (file_name, file_data, file_mime)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [originalname, buffer, mimetype]
        );

        res.status(201).json({
            id: result.rows[0].id,
            file_name: originalname
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * READ - List jadwal
 */
router.get("/", async (req, res) => {
    const result = await pool.query(
        "SELECT id, file_name FROM jadwal_db ORDER BY id DESC"
    );
    res.json(result.rows);
});

/**
 * READ - Ambil PDF by ID
 */
router.get("/:id/file", async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(
        "SELECT file_data, file_mime, file_name FROM jadwal_db WHERE id = $1",
        [id]
    );

    if (!result.rows.length) {
        return res.status(404).send("File not found");
    }

    const { file_data, file_mime, file_name } = result.rows[0];

    res.status(200);
    res.set({
        "Content-Type": file_mime,
        "Content-Length": file_data.length,
        "Content-Disposition": `inline; filename="${file_name}"`,
        "Cache-Control": "no-store"
    });

    res.end(file_data);
});

/**
 * DELETE
 */
router.delete("/:id", async (req, res) => {
    await pool.query("DELETE FROM jadwal_db WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted" });
});

export default router;
