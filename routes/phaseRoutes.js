import express from "express";
import { pool } from "../config/db.js";
const router = express.Router()

router.get("/", async (req, res) => {
    const result = await pool.query("SELECT * FROM db_phase ORDER BY id DESC");
    res.json(result.rows);
});

export default router;
