import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
const router = express.Router();

// Tambah soal (bisa banyak sekaligus)
router.post("/", verifyToken, async (req, res) => {
    try {
        const { bank_soal_id, soal_list } = req.body;
        const guru_id = req.users.id;

        if (!bank_soal_id || !Array.isArray(soal_list)) {
            return res.status(400).json({ message: "bank_soal_id dan soal_list wajib" });
        }

        const bankSoalCheck = await pool.query(
            "SELECT id FROM bank_soal WHERE id = $1 AND guru_id = $2",
            [bank_soal_id, guru_id]
        );

        if (!bankSoalCheck.rows.length) {
            res.status(403).json({ message: "Unauthorized" });
        }

        for (const soal of soal_list) {
            await pool.query(
                `INSERT INTO soal_pilgan (
                    pertanyaan,
                    pg_a, pg_b, pg_c, pg_d, pg_e,
                    kunci_jawaban,
                    gambar,
                    gambar_mimetype,
                    bank_soal_id,
                    pertanyaan_essai,
                    gambar_soal_essai,
                    gambar_essai_mimetype
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [
                    soal.pertanyaan ?? null,
                    soal.pg_a ?? null,
                    soal.pg_b ?? null,
                    soal.pg_c ?? null,
                    soal.pg_d ?? null,
                    soal.pg_e ?? null,
                    soal.kunci_jawaban ?? null,

                    soal.gambar ? Buffer.from(soal.gambar, "base64") : null,
                    soal.gambar_mimetype ?? null,

                    bank_soal_id,

                    soal.pertanyaan_essai ?? null,
                    soal.gambar_soal_essai
                        ? Buffer.from(soal.gambar_soal_essai, "base64")
                        : null,
                    soal.gambar_essai_mimetype ?? null,
                ]
            );
        }

        res.status(201).json({ message: "Soal berhasil ditambahkan" });
    } catch (error) {
        console.error("POST SOAL ERROR:", error);
        res.status(500).json({ message: "Gagal menambah soal" });
    }
});

// untuk menampilkan gambar soal
router.get("/gambar/:id", async (req, res) => {
    const { id } = req.params;

    const result = await pool.query(
        "SELECT gambar, gambar_mimetype FROM soal_pilgan WHERE id = $1",
        [id]
    );

    if (!result.rows.length || !result.rows[0].gambar) {
        return res.status(404).end();
    }

    res.setHeader("Content-Type", result.rows[0].gambar_mimetype);
    res.send(result.rows[0].gambar);
});

// Ambil semua soal berdasarkan bank_soal_id (PG + Essai)
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
                sp.gambar_mimetype,
                sp.pertanyaan_essai,
                sp.gambar_soal_essai,
                sp.gambar_essai_mimetype,
                sp.created_at
            FROM soal_pilgan sp
            JOIN bank_soal bs ON sp.bank_soal_id = bs.id
            WHERE sp.bank_soal_id = $1`,
            [id]
        );

        const data = result.rows.map(row => ({
            ...row,
            gambar: row.gambar ? row.gambar.toString("base64") : null,
            gambar_mimetype: row.gambar_mimetype,

            gambar_soal_essai: row.gambar_soal_essai
                ? row.gambar_soal_essai.toString("base64")
                : null,
            gambar_essai_mimetype: row.gambar_essai_mimetype,
        }));

        res.json(data);
    } catch (error) {
        console.error("GET SOAL ERROR:", error);
        res.status(500).json({ message: "Gagal mengambil soal" });
    }
});

// Update soal pilgan berdasarkan id
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

        await client.query("DELETE FROM soal_pilgan WHERE bank_soal_id = $1", [bank_soal_id]);

        for (const soal of soal_list) {
            await client.query(
                `INSERT INTO soal_pilgan (
                    pertanyaan,
                    pg_a, pg_b, pg_c, pg_d, pg_e,
                    kunci_jawaban,
                    gambar,
                    gambar_mimetype,
                    bank_soal_id,
                    pertanyaan_essai,
                    gambar_soal_essai,
                    gambar_essai_mimetype
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
                [
                    soal.pertanyaan ?? null,
                    soal.pg_a ?? null,
                    soal.pg_b ?? null,
                    soal.pg_c ?? null,
                    soal.pg_d ?? null,
                    soal.pg_e ?? null,
                    soal.kunci_jawaban ?? null,
                    soal.gambar ? Buffer.from(soal.gambar, "base64") : null,
                    soal.gambar_mimetype ?? null,
                    bank_soal_id,
                    soal.pertanyaan_essai ?? null,
                    soal.gambar_soal_essai
                        ? Buffer.from(soal.gambar_soal_essai, "base64")
                        : null,
                    soal.gambar_essai_mimetype ?? null,
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

router.get("/soal-siswa/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT 
                sp.id,
                sp.bank_soal_id,
                sp.pertanyaan,
                sp.pg_a,
                sp.pg_b,
                sp.pg_c,
                sp.pg_d,
                sp.pg_e,
                sp.pertanyaan_essai,
                sp.gambar,
                sp.gambar_mimetype,
                sp.gambar_soal_essai,
                sp.gambar_essai_mimetype
            FROM soal_pilgan sp
            WHERE sp.bank_soal_id = $1`,
            [id]
        );

        const data = result.rows.map(row => ({
            ...row,
            gambar: row.gambar ? row.gambar.toString("base64") : null,
            gambar_soal_essai: row.gambar_soal_essai
                ? row.gambar_soal_essai.toString("base64")
                : null,
        }));

        res.json(data);
    } catch (error) {
        console.error("GET SOAL SISWA ERROR:", error);
        res.status(500).json({ message: "Gagal mengambil soal" });
    }
});

export default router;
