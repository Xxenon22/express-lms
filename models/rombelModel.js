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
    async create({ name_rombel, grade_id, jurusan_id, colab_class }) {

        const result = await pool.query(
            `INSERT INTO rombel (name_rombel, grade_id, jurusan_id, colab_class)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [name_rombel, grade_id, jurusan_id, colab_class]
        );
        return result.rows[0];
    },

    // ========================
    // UPDATE
    // ========================
    async update(id, data) {
        const fields = [];
        const values = [];
        let index = 1;

        // Loop data yang dikirim, hanya update yang ada
        for (const key in data) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
                fields.push(`${key} = $${index}`);
                values.push(data[key]);
                index++;
            }
        }

        // Jika tidak ada field yang diupdate
        if (fields.length === 0) {
            return { message: "No fields to update" };
        }

        // Tambahkan ID untuk WHERE
        values.push(id);

        const query = `
        UPDATE rombel 
        SET ${fields.join(", ")}
        WHERE id = $${index}
        RETURNING *;
    `;

        const result = await pool.query(query, values);
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
