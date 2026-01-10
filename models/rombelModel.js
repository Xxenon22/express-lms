// models/rombel.model.js
import { pool } from "../config/db.js";

export const RombelModel = {

    // ========================
    // GET ALL
    // ========================
    async getAll() {
        const { rows } = await pool.query(`
        SELECT
            r.id,
            r.name_rombel,
            r.grade_id,
            r.jurusan_id,
            r.colab_class,

            gl.grade_lvl AS grade_name,
            j.nama_jurusan AS major,
            nr.number AS rombel_number

        FROM rombel r
        LEFT JOIN grade_level gl ON gl.id = r.grade_id
        LEFT JOIN jurusan j ON j.id = r.jurusan_id
        LEFT JOIN number_rombel nr ON nr.id = r.name_rombel

        ORDER BY r.id DESC
    `);

        return rows;
    },

    // ========================
    // CREATE
    // ========================
    async create({ name_rombel, grade_id, jurusan_id }) {
        const { rows } = await pool.query(
            `
            INSERT INTO rombel (name_rombel, grade_id, jurusan_id)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [name_rombel, grade_id, jurusan_id]
        );
        return rows[0];
    },

    async createCollab({ colab_class }) {
        const { rows } = await pool.query(
            `
            INSERT INTO rombel (colab_class)
            VALUES ($1)
            RETURNING *
            `,
            [colab_class]
        );
        return rows[0];
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
