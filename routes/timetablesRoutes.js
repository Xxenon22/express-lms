import express from "express";
import path from "path";
import fs from "fs";
import { pool } from "../config/db.js";
import { pdfUpload } from "../utils/pdfUploader.js";

const router = express.Router();
const upload = pdfUpload("uploads/timetables-grade-x");

/**
 * CREATE
 */
router.post("/", upload.single("jadwal"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "PDF required" });
    }

    const fileUrl = `/uploads/timetables-grade-x/${req.file.filename}`;

    const result = await pool.query(
        `INSERT INTO jadwal_x_db (file_name, file_url)
         VALUES ($1, $2)
         RETURNING id`,
        [req.file.originalname, fileUrl]
    );

    res.status(201).json({
        id: result.rows[0].id,
        file_url: fileUrl,
    });
});

/**
 * READ LIST
 */
router.get("/", async (req, res) => {
    const result = await pool.query(
        "SELECT id, file_name, file_url FROM jadwal_x_db ORDER BY id DESC"
    );
    res.json(result.rows);
});

router.get("/:id/file", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "SELECT file_url FROM timetables WHERE id = $1",
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: "File not found in DB" });
        }

        const filePath = path.join(
            process.cwd(),
            result.rows[0].file_url
        );

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "PDF not found on server" });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");

        res.sendFile(filePath);
    } catch (err) {
        console.error("TIMETABLE FILE ERROR:", err);
        res.status(500).json({ message: "Failed to load PDF" });
    }
});

/**
 * DELETE
 */
router.delete("/:id", async (req, res) => {
    const old = await pool.query(
        "SELECT file_url FROM jadwal_x_db WHERE id=$1",
        [req.params.id]
    );

    if (old.rows.length && old.rows[0].file_url) {
        const filePath = path.join(process.cwd(), old.rows[0].file_url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query("DELETE FROM jadwal_x_db WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
});

export default router;
