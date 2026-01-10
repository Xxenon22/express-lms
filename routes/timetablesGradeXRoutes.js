import fs from "fs";
import path from "path";
import express from "express";
import { pool } from "../config/db.js";
import { pdfUpload } from "../utils/pdfUploader.js";

const router = express.Router();

const UPLOAD_ROOT = "/var/www/uploads";
const FOLDER = "timetables-grade-x";

const upload = pdfUpload(FOLDER);

router.post("/", upload.single("jadwal"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "PDF required" });
    }

    const fileUrl = `/uploads/${FOLDER}/${req.file.filename}`;

    const result = await pool.query(
        `INSERT INTO jadwal_x_db (file_name, file_url)
         VALUES ($1, $2)
         RETURNING id, file_url`,
        [req.file.originalname, fileUrl]
    );

    res.status(201).json(result.rows[0]);
});

router.get("/", async (req, res) => {
    const result = await pool.query(
        "SELECT id, file_name, file_url FROM jadwal_x_db ORDER BY id DESC"
    );

    res.json(
        result.rows.filter(r =>
            fs.existsSync(path.join(
                UPLOAD_ROOT,
                r.file_url.replace("/uploads/", "")
            ))
        )
    );
});

router.get("/:id/file", async (req, res) => {
    const result = await pool.query(
        "SELECT file_url FROM jadwal_x_db WHERE id=$1",
        [req.params.id]
    );

    if (!result.rows.length) {
        return res.status(404).json({ message: "Not found" });
    }

    const filePath = path.join(
        UPLOAD_ROOT,
        result.rows[0].file_url.replace("/uploads/", "")
    );

    if (!fs.existsSync(filePath)) {
        return res.status(410).json({ message: "PDF missing on server" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(filePath);
});

router.delete("/:id", async (req, res) => {
    const old = await pool.query(
        "SELECT file_url FROM jadwal_x_db WHERE id=$1",
        [req.params.id]
    );

    if (old.rows.length) {
        const filePath = path.join(
            UPLOAD_ROOT,
            old.rows[0].file_url.replace("/uploads/", "")
        );
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query("DELETE FROM jadwal_x_db WHERE id=$1", [req.params.id]);
    res.json({ message: "Deleted" });
});

export default router;
