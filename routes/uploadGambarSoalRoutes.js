import express from "express";
import path from "path";
import fs from "fs";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadGambarSoal } from "../middleware/uploadGambarSoal.js";
import { safeUnlink } from "../utils/safeFile.js";
const router = express.Router();

router.post(
    "/:type",
    verifyToken,
    uploadGambarSoal.single("gambar"),
    async (req, res) => {
        const { type } = req.params;

        const column =
            type === "pg" ? "gambar" :
                type === "essai" ? "gambar_soal_essai" : null;

        if (!column) {
            return res.status(400).json({ message: "Tipe tidak valid" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "File tidak ditemukan" });
        }

        // 1️⃣ CREATE SOAL BARU
        const insert = await pool.query(
            `INSERT INTO soal_pilgan DEFAULT VALUES RETURNING id`
        );

        const soalId = insert.rows[0].id;

        // 2️⃣ UPDATE GAMBAR
        const imagePath = `/uploads/soal/${type}/${req.file.filename}`;

        await pool.query(
            `UPDATE soal_pilgan SET ${column} = $1 WHERE id = $2`,
            [imagePath, soalId]
        );

        res.json({
            id: soalId,
            path: imagePath
        });
    }
);

/* =========================================
   DELETE GAMBAR (PG / ESSAI)
========================================= */
router.delete("/:type/:soal_id", verifyToken, async (req, res) => {
    try {
        const { type, soal_id } = req.params;

        const column =
            type === "pg"
                ? "gambar"
                : type === "essai"
                    ? "gambar_soal_essai"
                    : null;

        if (!column) {
            return res.status(400).json({ message: "Tipe gambar tidak valid" });
        }

        const result = await pool.query(
            `SELECT ${column} FROM soal_pilgan WHERE id = $1`,
            [soal_id]
        );

        if (!result.rows.length || !result.rows[0][column]) {
            return res.status(404).json({ message: "Gambar tidak ditemukan" });
        }

        const filePath = path.join("/var/www", result.rows[0][column]);

        if (fs.existsSync(filePath)) {
            await safeUnlink(filePath);
        }

        await pool.query(
            `UPDATE soal_pilgan SET ${column} = NULL WHERE id = $1`,
            [soal_id]
        );

        res.json({ message: "Gambar berhasil dihapus" });
    } catch (error) {
        console.error("DELETE GAMBAR ERROR:", error);
        res.status(500).json({ message: "Gagal menghapus gambar" });
    }
});

export default router;
