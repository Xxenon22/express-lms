import express from "express";
import multer from "multer";
import path from "path";
import { pool } from "../config/db.js"; // DB configuration
import { verifyToken } from "../middleware/authMiddleware.js"; // Authentication middleware
import fs from "fs";

const router = express.Router();

const UPLOAD_DIR = "/var/www/uploads/users";

// pastikan folder ada
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        cb(null, `users-${req.user.id}.jpg`); // 🔥 OVERWRITE
    }
});

const upload = multer({ storage });
// Route to upload profile photo

router.put(
    "/photo-profile",
    verifyToken,
    upload.single("profile"),
    async (req, res) => {
        const photoPath = `/uploads/users/users-${req.user.id}.jpg`;

        await pool.query(
            "UPDATE users SET photo_url = $1 WHERE id = $2",
            [photoPath, req.user.id]
        );

        res.json({
            message: "Photo updated",
            path: photoPath // 🔥 STATIC PATH
        });
    }
);

export default router;
