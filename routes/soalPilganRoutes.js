import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================
   TAMBAH SOAL (BULK)
========================================= */
router.post("/", verifyToken, async (req, res) => {
    try {
        const { bank_soal_id, soal_list } = req.body;
        const guru_id = req.users.id;

        if (!bank_soal_id || !Array.isArray(soal_list)) {
            return res.status(400).json({
                message: "bank_soal_id dan soal_list wajib"
            });
        }

        const bankSoalCheck = await pool.query(
            "SELECT id FROM bank_soal WHERE id = $1 AND guru_id = $2",
            [bank_soal_id, guru_id]
        );

        if (!bankSoalCheck.rows.length) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        for (const soal of soal_list) {
            await pool.query(
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
                    soal.gambar ?? null,              // PATH FILE
                    bank_soal_id,
                    soal.pertanyaan_essai ?? null,
                    soal.gambar_soal_essai ?? null    // PATH FILE
                ]
            );
        }

        res.status(201).json({ message: "Soal berhasil ditambahkan" });
    } catch (error) {
        console.error("POST SOAL ERROR:", error);
        res.status(500).json({ message: "Gagal menambah soal" });
    }
});

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
