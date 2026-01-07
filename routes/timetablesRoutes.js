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
