import express from "express";
import { pool } from "../config/db.js";
const router = express.Router();

// Tambah soal (bisa banyak sekaligus)
router.post("/", async (req, res) => {
    try {
        const { bank_soal_id, soal_list } = req.body;
        const guru_id = req.users.id;

        if (!bank_soal_id || !Array.isArray(soal_list)) {
            return res.status(400).json({ message: "bank_soal_id dan soal_list are required" });
        }

        const bankSoalCheck = await pool.query(
            "SELECT id FROM bank_soal WHERE id = $1 AND guru_id = $2",
            [bank_soal_id, guru_id]
        );

        if (!bankSoalCheck.rows.length) {
            return res.status(403).json({
                message: "Unauthorized access to bank soal",
            });
        }

        const insertedSoal = [];

        for (let soal of soal_list) {

            console.log("📝 Saving question:", {
                hasImage: !!soal.gambar,
                mimetype: soal.gambar_mimetype,
            });

            const result = await pool.query(
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
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id`,
                [
                    soal.pertanyaan,
                    soal.pg_a,
                    soal.pg_b,
                    soal.pg_c,
                    soal.pg_d,
                    soal.pg_e,
                    soal.kunci_jawaban,

                    // ✅ GAMBAR PG
                    soal.gambar ? Buffer.from(soal.gambar, "base64") : null,
                    soal.gambar_mimetype || null,

                    bank_soal_id,

                    soal.pertanyaan_essai,

                    // ✅ GAMBAR ESSAI
                    soal.gambar_soal_essai
                        ? Buffer.from(soal.gambar_soal_essai, "base64")
                        : null,
                    soal.gambar_essai_mimetype || null,
                ]
            );

            console.log("✅ Question saved:", {
                soal_id: result.rows[0].id,
                imageSaved: !!soal.gambar,
                mimetype: soal.gambar_mimetype,
            });
        }

        res.status(201).json({
            message: "Question added successfully",
            data: insertedSoal,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while adding the question" });
    }
});

// Ambil semua soal berdasarkan bank_soal_id (PG + Essai)
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const guru_id = req.users.id;

        // 🔐 validasi kepemilikan
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
             WHERE sp.bank_soal_id = $1`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Failed to retrieve Questions:", error);
        res.status(500).json({ error: "Failed to retrieve Questions" });
    }
});

// Update soal pilgan berdasarkan id
router.put("/:bank_soal_id", async (req, res) => {
    const client = await pool.connect();
    try {
        const { bank_soal_id } = req.params;
        const { soal_list, judul_penugasan } = req.body;
        const guru_id = req.users.id;

        if (!Array.isArray(soal_list)) {
            return res.status(400).json({ message: "soal_list must be array" });
        }

        await client.query("BEGIN");

        // 🔐 validasi kepemilikan bank soal
        const bankSoalCheck = await pool.query(
            "SELECT id FROM bank_soal WHERE id = $1 AND guru_id = $2",
            [bank_soal_id, guru_id]
        );

        if (!bankSoalCheck.rows.length) {
            return res.status(403).json({
                message: "Unauthorized access to bank soal",
            });
        }

        if (judul_penugasan && judul_penugasan.trim() !== "") {
            await client.query(
                "UPDATE bank_soal SET judul_penugasan = $1 WHERE id = $2",
                [judul_penugasan, bank_soal_id]
            );
        }


        // hapus semua soal lama
        await pool.query("DELETE FROM soal_pilgan WHERE bank_soal_id = $1", [bank_soal_id]);

        // insert ulang soal
        const inserted = [];
        for (const soal of soal_list) {
            const result = await pool.query(
                `INSERT INTO soal_pilgan 
                (
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
                    gambar_soal_essai
                )
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
                    soal.gambar ?? null,
                    bank_soal_id,
                    soal.pertanyaan_essai ?? null,
                    soal.gambar_soal_essai ?? null,
                ]
            );
            inserted.push(result.rows[0]);
        }

        await client.query("COMMIT");

        res.json({ message: "Question updated successfully", data: inserted });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update Questions" });
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

export default router;
