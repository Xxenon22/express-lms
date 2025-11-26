import { pool } from "../config/db.js";

// =====================================
// CREATE USER (dengan kode & expired)
// =====================================
export const createUser = async (
    email,
    username,
    hashedPassword,
    role = "student",
    verificationCode,
    verificationExpires
) => {
    const result = await pool.query(
        `INSERT INTO users 
            (email, username, password, role, verification_code, verification_expires, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, false)
         RETURNING id, email, username, role, verification_code`,
        [email, username, hashedPassword, role, verificationCode, verificationExpires]
    );
    return result.rows[0];
};

// =====================================
// FIND USER BY EMAIL
// =====================================
export const findUserByEmail = async (email) => {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
};

// =====================================
// UPDATE USER BY ID
// =====================================
// fields = { is_verified: true, verification_code: null }
export const updateUser = async (email, fields) => {
    const keys = Object.keys(fields);
    const values = Object.values(fields);

    const setQuery = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");

    // Update berdasarkan email
    const result = await pool.query(
        `UPDATE users SET ${setQuery} WHERE email = $${keys.length + 1} RETURNING *`,
        [...values, email]
    );

    return result.rows[0];
};

// =====================================
// GET USER BY ID (optional, kamu jarang pakai ini)
// =====================================
export const getUserById = async (req, res) => {
    const { guruId } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM users WHERE id = $1 ORDER BY created_at DESC`,
            [guruId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
