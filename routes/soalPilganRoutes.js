import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

/* =======================
   MULTER CONFIG
======================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "uploads/soal";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

/* =======================
   CREATE SOAL (BULK + IMAGE)
======================= */
router.post(
    "/",
    verifyToken,
    upload.any(),
    async (req, res) => {
        try {
            const { bank_soal_id, soal_list } = JSON.parse(req.body.data);
            const guru_id = req.users.id;

            // VALIDASI BANK SOAL
            const cek = await pool.query(
                "SELECT id FROM bank_soal WHERE id = $1 AND guru_id = $2",
                [bank_soal_id, guru_id]
            );

            if (!cek.rows.length) {
                return res.status(403).json({ message: "Unauthorized" });
            }

            for (let i = 0; i < soal_list.length; i++) {
                const soal = soal_list[i];

                const pgImage = req.files.find(
                    f => f.fieldname === `pg_image_${i}`
                );

                const essaiImage = req.files.find(
                    f => f.fieldname === `essai_image_${i}`
                );

                await pool.query(
                    `INSERT INTO soal_pilgan (
                        pertanyaan,
                        pg_a, pg_b, pg_c, pg_d, pg_e,
                        kunci_jawaban,
                        gambar,
                        pertanyaan_essai,
                        gambar_soal_essai,
                        bank_soal_id
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                    [
                        soal.pertanyaan ?? null,
                        soal.pg_a ?? null,
                        soal.pg_b ?? null,
                        soal.pg_c ?? null,
                        soal.pg_d ?? null,
                        soal.pg_e ?? null,
                        soal.kunci_jawaban ?? null,
                        pgImage ? `/uploads/soal/${pgImage.filename}` : null,
                        soal.pertanyaan_essai ?? null,
                        essaiImage ? `/uploads/soal/${essaiImage.filename}` : null,
                        bank_soal_id
                    ]
                );
            }

            res.status(201).json({ message: "Soal berhasil disimpan" });
        } catch (err) {
            console.error("POST SOAL ERROR:", err);
            res.status(500).json({ message: "Server error" });
        }
    }
);

/* =========================================
   GET SOAL BY BANK SOAL (GURU)
========================================= */
router.get("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const guru_id = req.users.id;

        const bankSoalCheck = await pool.query(
            "SELECT id FROM bank_soal WHERE id = $1 AND guru_id = $2",
            [id, guru_id]
        );

        if (!bankSoalCheck.rows.length) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const result = await pool.query(
            `SELECT 
                sp.id,
                sp.bank_soal_id,
                bs.judul_penugasan,
                sp.pertanyaan,
                sp.pg_a,
                sp.pg_b,
                sp.pg_c,
                sp.pg_d,
                sp.pg_e,
                sp.kunci_jawaban,
                sp.gambar,
                sp.pertanyaan_essai,
                sp.gambar_soal_essai,
                sp.created_at
            FROM soal_pilgan sp
            JOIN bank_soal bs ON sp.bank_soal_id = bs.id
            WHERE sp.bank_soal_id = $1
            ORDER BY sp.id ASC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("GET SOAL ERROR:", error);
        res.status(500).json({ message: "Gagal mengambil soal" });
    }
});

/* =========================================
   UPDATE SOAL (REPLACE ALL)
========================================= */
router.put("/:bank_soal_id", verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { bank_soal_id } = req.params;
        const { soal_list, judul_penugasan } = req.body;
        const guru_id = req.users.id;

        await client.query("BEGIN");

        const bankSoalCheck = await client.query(
            "SELECT id FROM bank_soal WHERE id = $1 AND guru_id = $2",
            [bank_soal_id, guru_id]
        );

        if (!bankSoalCheck.rows.length) {
            await client.query("ROLLBACK");
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (judul_penugasan) {
            await client.query(
                "UPDATE bank_soal SET judul_penugasan = $1 WHERE id = $2",
                [judul_penugasan, bank_soal_id]
            );
        }

        await client.query(
            "DELETE FROM soal_pilgan WHERE bank_soal_id = $1",
            [bank_soal_id]
        );

        for (const soal of soal_list) {
            await client.query(
                `INSERT INTO soal_pilgan (
                    pertanyaan,
                    pg_a, pg_b, pg_c, pg_d, pg_e,
                    kunci_jawaban,
                    gambar,
                    bank_soal_id,
                    pertanyaan_essai,
                    gambar_soal_essai
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
                [
                    soal.pertanyaan ?? null,
                    soal.pg_a ?? null,
                    soal.pg_b ?? null,
                    soal.pg_c ?? null,
                    soal.pg_d ?? null,
                    soal.pg_e ?? null,
                    soal.kunci_jawaban ?? null,
                    soal.gambar ?? null,
                    bank_soal_id,
                    soal.pertanyaan_essai ?? null,
                    soal.gambar_soal_essai ?? null
                ]
            );
        }

        await client.query("COMMIT");
        res.json({ message: "Soal berhasil diperbarui" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("UPDATE SOAL ERROR:", error);
        res.status(500).json({ message: "Gagal update soal" });
    } finally {
        client.release();
    }
});

/* =========================================
   GET SOAL UNTUK SISWA
========================================= */
router.get("/soal-siswa/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
                id,
                bank_soal_id,
                pertanyaan,
                pg_a,
                pg_b,
                pg_c,
                pg_d,
                pg_e,
                pertanyaan_essai,
                gambar,
                gambar_soal_essai
            FROM soal_pilgan
            WHERE bank_soal_id = $1
            ORDER BY id ASC`,
            [id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("GET SOAL SISWA ERROR:", error);
        res.status(500).json({ message: "Gagal mengambil soal" });
    }
});

export default router;
