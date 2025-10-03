import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Setup multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "uploads/photo-profile";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
        cb(null, uniqueName);
    },
});

const upload = multer({ storage });

// Upload / Update foto profil
router.post("/", verifyToken, upload.single("profile"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.users.id;
        const imageUrl = `/uploads/photo-profile/${req.file.filename}`;

        // Ambil foto lama dari database
        const oldPhoto = await pool.query(
            "SELECT photo_profiles_user FROM users WHERE id = $1",
            [userId]
        );

        if (oldPhoto.rows.length > 0 && oldPhoto.rows[0].photo_profiles_user) {
            const oldPath = path.join(process.cwd(), oldPhoto.rows[0].photo_profiles_user);

            // Hapus file lama jika ada
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
                console.log("Foto lama dihapus:", oldPath);
            }
        }

        // Update DB dengan foto baru
        await pool.query(
            "UPDATE users SET photo_profiles_user = $1 WHERE id = $2",
            [imageUrl, userId]
        );

        console.log("USER ID:", req.users);
        console.log("FILE:", req.file);

        res.json({ message: "Profile picture updated successfully", imageUrl });
    } catch (error) {
        console.error("Error upload profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
