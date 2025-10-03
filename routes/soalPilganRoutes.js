import express from "express";
import { pool } from "../config/db.js";
const router = express.Router();

// Tambah soal (bisa banyak sekaligus)
router.post("/", async (req, res) => {
    try {
        const { bank_soal_id, guru_id, soal_list } = req.body;

        if (!bank_soal_id || !guru_id || !Array.isArray(soal_list)) {
            return res.status(400).json({ message: "bank_soal_id, guru_id, dan soal_list wajib diisi" });
        }

        const insertedSoal = [];

        for (let soal of soal_list) {
            const {
                pertanyaan,
                pg_a,
                pg_b,
                pg_c,
                pg_d,
                pg_e,
                kunci_jawaban,
                gambar = null,
                pertanyaan_essai = null,
                gambar_soal_essai = null,
            } = soal;

            const result = await pool.query(
                `INSERT INTO soal_pilgan 
        (pertanyaan, pg_a, pg_b, pg_c, pg_d, pg_e, kunci_jawaban, gambar, bank_soal_id, pertanyaan_essai, gambar_soal_essai) 
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
                [
                    pertanyaan,
                    pg_a,
                    pg_b,
                    pg_c,
                    pg_d,
                    pg_e,
                    kunci_jawaban,
                    gambar,
                    bank_soal_id,
                    pertanyaan_essai,
                    gambar_soal_essai,
                ]
            );

            insertedSoal.push(result.rows[0]);
        }

        res.status(201).json({
            message: "Soal berhasil ditambahkan",
            data: insertedSoal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Terjadi kesalahan saat menambah soal" });
    }
});

// Ambil semua soal berdasarkan bank_soal_id (PG + Essai)
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
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
             WHERE sp.bank_soal_id = $1`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Gagal ambil soal:", error);
        res.status(500).json({ error: "Gagal ambil soal" });
    }
});

// Update soal pilgan berdasarkan id
router.put("/:bank_soal_id", async (req, res) => {
    try {
        const { bank_soal_id } = req.params;
        const { guru_id, soal_list } = req.body;

        if (!Array.isArray(soal_list)) {
            return res.status(400).json({ message: "soal_list harus berupa array" });
        }
        // hapus semua soal lama
        await pool.query("DELETE FROM soal_pilgan WHERE bank_soal_id = $1", [bank_soal_id]);

        // insert ulang soal
        const inserted = [];
        for (let soal of soal_list) {
            const result = await pool.query(
                `INSERT INTO soal_pilgan 
                (pertanyaan, pg_a, pg_b, pg_c, pg_d, pg_e, kunci_jawaban, gambar, bank_soal_id, pertanyaan_essai, gambar_soal_essai)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                RETURNING *`,
                [
                    soal.pertanyaan,
                    soal.pg_a,
                    soal.pg_b,
                    soal.pg_c,
                    soal.pg_d,
                    soal.pg_e,
                    soal.kunci_jawaban,
                    soal.gambar,
                    bank_soal_id,
                    soal.pertanyaan_essai,
                    soal.gambar_soal_essai,
                ]
            );
            inserted.push(result.rows[0]);
        }

        res.json({ message: "Soal berhasil diperbarui", data: inserted });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal update soal" });
    }
});
export default router;
