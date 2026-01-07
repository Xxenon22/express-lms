import express from "express";
import path from "path";
import fs from "fs";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { uploadSoal } from "../middleware/uploadGambarSoal.js";

const router = express.Router();

/* =========================================
   UPLOAD GAMBAR PILGAN
========================================= */
router.post(
    "/pg/:soal_id",
    verifyToken,
    uploadSoal.single("gambar"),
    async (req, res) => {
        try {
            const { soal_id } = req.params;

            if (!req.file) {
                return res.status(400).json({ message: "File not Found" });
            }

            const imagePath = `/uploads/soal/pg/${req.file.filename}`;

            await pool.query(
                "UPDATE soal_pilgan SET gambar = $1 WHERE id = $2",
                [imagePath, soal_id]
            );

            res.json({
                message: "Upload image successfully",
                path: imagePath
            });
        } catch (error) {
            console.error("UPLOAD GAMBAR PG ERROR:", error);
            res.status(500).json({ message: "Failed Upload" });
        }
    }
);

/* =========================================
   UPLOAD GAMBAR ESSAI
========================================= */
router.post(
    "/essai/:soal_id",
    verifyToken,
    uploadSoal.single("gambar"),
    async (req, res) => {
        try {
            const { soal_id } = req.params;

            if (!req.file) {
                return res.status(400).json({ message: "File not found" });
            }

            const imagePath = `/uploads/soal/essai/${req.file.filename}`;

            await pool.query(
                "UPDATE soal_pilgan SET gambar_soal_essai = $1 WHERE id = $2",
                [imagePath, soal_id]
            );

            res.json({
                message: "Gambar essai berhasil diupload",
                path: imagePath
            });
        } catch (error) {
            console.error("UPLOAD GAMBAR ESSAI ERROR:", error);
            res.status(500).json({ message: "Upload gagal" });
        }
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

        const filePath = path.join(process.cwd(), result.rows[0][column]);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
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
