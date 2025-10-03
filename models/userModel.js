import { pool } from "../config/db.js";

export const createUser = async (email, username, hashedPassword, role = "student") => {
    const result = await pool.query(
        "INSERT INTO users (email, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id,  email, username, role",
        [email, username, hashedPassword, role]
    );
    return result.rows[0];
};

export const getUserById = async (res, req) => {
    const { guruId } = req.params
    try {
        const result = await pool.query(
            `SELECT * FROM users WHERE guru_id = $1 ORDER BY created_at DESC`,
            [guruId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

export const findUserByEmail = async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
};
