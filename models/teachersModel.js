import { pool } from "../config/db.js";

export const TeachersModel = {
    async getAll() {
        const result = await pool.query("SELECT * FROM db_guru ORDER BY id ASC");
        return result.rows;
    },

    async getById(id) {
        const result = await pool.query("SELECT * FROM db_guru WHERE id=$1", [id]);
        return result.rows[0];
    },

    async create(name) {

        const result = await pool.query("INSERT INTO db_guru (name) VALUES ($1) RETURNING *", [name]);
        return result.rows[0]
    },

    async update(id, name) {
        const result = await pool.query("UPDATE db_guru SET name=$1 WHERE id=$2 RETURNING *",
            [name, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await pool.query("DELETE FROM db_guru WHERE id=$1", [id]);
        return { message: "Teacher deleted" }
    }
}