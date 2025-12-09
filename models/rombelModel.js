// models/rombel.model.js
import { pool } from "../config/db.js";

export const RombelModel = {

    // ========================
    // GET ALL
    // ========================
    async getAll() {
        const result = await pool.query(`
            SELECT 
                r.id,
                r.name_rombel,
                n.number AS rombel_number,
                g.id AS grade_id, 
                g.grade_lvl AS grade_name,
                j.id AS jurusan_id,
                j.nama_jurusan AS major
            FROM rombel r
            LEFT JOIN grade_level g ON r.grade_id = g.id
            LEFT JOIN jurusan j ON r.jurusan_id = j.id
            LEFT JOIN number_rombel n ON r.name_rombel = n.id
            ORDER BY r.id ASC
        `);
        return result.rows;
    },

    // ========================
    // CREATE
    // ========================
    async create({ name_rombel, grade_id, jurusan_id }) {

        const result = await pool.query(
            `INSERT INTO rombel (name_rombel, grade_id, jurusan_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name_rombel, grade_id, jurusan_id]
        );

        return result.rows[0];
    },

    // ========================
    // UPDATE
    // ========================
    async update(id, { name_rombel, grade_id, jurusan_id }) {

        // Validasi minimal biar tidak null/undefined
        if (!id) throw new Error("ID is required");

        const result = await pool.query(
            `UPDATE rombel 
             SET name_rombel = $1, grade_id = $2, jurusan_id = $3
             WHERE id = $4
             RETURNING *`,
            [name_rombel, grade_id, jurusan_id, id]
        );

        return result.rows[0];
    },

    // ========================
    // DELETE
    // ========================
    async delete(id) {
        await pool.query(
            "DELETE FROM rombel WHERE id = $1",
            [id]
        );
        return { message: "Rombel deleted" };
    }
};
