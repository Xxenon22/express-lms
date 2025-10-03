import { pool } from "../config/db.js";

export const RombelModel = {
    async getAll() {
        const result = await pool.query(`
      SELECT 
        r.id, 
        r.name_rombel, 
        g.id AS grade_id, 
        g.grade_lvl AS grade_name
      FROM rombel r
      LEFT JOIN grade_level g ON r.grade_id = g.id
      ORDER BY r.id ASC
    `);
        return result.rows;
    },

    async create(name_rombel, grade_id) {
        const result = await pool.query(
            "INSERT INTO rombel (name_rombel, grade_id) VALUES ($1, $2) RETURNING *",
            [name_rombel, grade_id]
        );
        return result.rows[0];
    },

    async update(id, name_rombel, grade_id) {
        const result = await pool.query(
            "UPDATE rombel SET name_rombel=$1, grade_id=$2 WHERE id=$3 RETURNING *",
            [name_rombel, grade_id, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await pool.query("DELETE FROM rombel WHERE id=$1", [id]);
        return { message: "Rombel deleted" };
    },
};
