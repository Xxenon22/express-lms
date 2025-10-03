import { pool } from "../config/db.js";

export const MapelModel = {
    async getAll() {
        const result = await pool.query("SELECT * FROM db_mapel ORDER BY id ASC");
        return result.rows;
    },

    async getById(id) {
        const result = await pool.query("SELECT * FROM db_mapel WHERE id=$1", [id]);
        return result.rows[0];
    },

    async create(nama_mapel) {
        const result = await pool.query(
            "INSERT INTO db_mapel (nama_mapel) VALUES ($1) RETURNING *",
            [nama_mapel]
        );
        return result.rows[0];
    },

    async update(id, nama_mapel) {
        const result = await pool.query(
            "UPDATE db_mapel SET nama_mapel=$1 WHERE id=$2 RETURNING *",
            [nama_mapel, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        await pool.query("DELETE FROM db_mapel WHERE id=$1", [id]);
        return { message: "Mapel deleted" };
    },
};
