import { pool } from "../config/db.js";

export const UsersModel = {
    async getAll() {
        const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
        return result.rows;
    },

    async getById(id) {
        const result = await pool.query("SELECT * FROM users WHERE id=$1", [id]);
        return result.rows[0];
    },

    async create(username) {

        const result = await pool.query("INSERT INTO users (username) VALUES ($1) RETURNING *", [username]);
        return result.rows[0]
    },

    async update(id, username) {
        const result = await pool.query("UPDATE users SET username=$1 WHERE id=$2 RETURNING *",
            [username, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await pool.query("DELETE FROM users WHERE id=$1", [id]);
        return { message: "user deleted" }
    }
}