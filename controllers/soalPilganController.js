import db from "../config/db.js";

export const createSoal = async (req, res) => {
    try {
        const { title, soal_list } = req.body;
        const guru_id = req.users.id; // ⬅️ dari token / middleware auth

        if (!title || !soal_list || soal_list.length === 0) {
            return res.status(400).json({
                message: "Title and question list are required",
            });
        }

        // insert ke tabel bank_soal
        const result = await db.query(
            `INSERT INTO bank_soal (title, guru_id) VALUES ($1, $2) RETURNING id`,
            [title, guru_id]
        );

        const bankSoalId = result.rows[0].id;

        // insert soal_list
        for (let soal of soal_list) {
            await db.query(
                `INSERT INTO soal (bank_soal_id, pertanyaan, opsi, jawaban) VALUES ($1, $2, $3, $4)`,
                [bankSoalId, soal.pertanyaan, JSON.stringify(soal.opsi), soal.jawaban]
            );
        }

        res.status(201).json({
            message: "Question created successfully",
            bank_soal_id: bankSoalId,
        });
    } catch (err) {
        console.error("Error createSoal:", err);
        res.status(500).json({ message: "Server error" });
    }
};
