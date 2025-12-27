import express from "express";
import multer from "multer";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer simpan ke memory (RAM)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 5 MB
    fileFilter(req, file, cb) {
        const allowed = ["image/jpeg", "image/png", "image/jpg"];
        cb(null, allowed.includes(file.mimetype));
    },
});

// UPDATE photo profile → SIMPAN KE DATABASE
router.put("/", verifyToken, upload.single("profile"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.users.id; // pastikan pakai verifyToken

        await pool.query(
            `UPDATE users 
             SET photo_profile = $1, photo_mime = $2, 
             updated_at = NOW()
             WHERE id = $3`,
            [req.file.buffer, req.file.mimetype, userId]);

        res.json({ message: "Photo profile updated successfully" });
    } catch (err) {
        console.error("Upload profile error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            "SELECT photo_profile, photo_mime FROM users WHERE id = $1",
            [userId]
        );

        if (!result.rows.length || !result.rows[0].photo_profile) {
            return res.status(404).send("Image not found");
        }

        res.set("Content-Type", result.rows[0].photo_mime);
        res.send(result.rows[0].photo_profile);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching image");
    }
});

router.use((err, req, res, next) => {
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
            message: "Maximum photo size is 10 MB",
        });
    }
    next(err);
});

export default router;
