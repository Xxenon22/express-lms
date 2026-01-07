import express from "express";
import multer from "multer";
import path from "path";
import { pool } from "../config/db.js"; // DB configuration
import { verifyToken } from "../middleware/authMiddleware.js"; // Authentication middleware
import fs from "fs";

const router = express.Router();

// Multer setup for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Directory where profile images are stored
        const uploadDir = path.join(process.cwd(), 'uploads', 'profile');
        // Ensure the directory exists, create it if not
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Using user ID to generate the filename
        const userId = req.users?.id;  // Ensure userId is available
        if (!userId) {
            return cb(new Error("User ID is missing."));
        }
        const extension = path.extname(file.originalname); // Get the file extension
        cb(null, `profile-${userId}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max file size: 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, JPEG, and PNG are allowed.'));
        }
    }
});

// Route to upload profile photo
router.put("/", verifyToken, upload.single("profile"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.users?.id;  // Ensure userId is available
        if (!userId) {
            return res.status(400).json({ message: "User not authenticated" });
        }

        const photoUrl = `/uploads/users/profile-${userId}${path.extname(req.file.originalname)}`;

        // Update the user's photo URL in the database
        const result = await pool.query(
            `
            UPDATE users
            SET photo_url = $1
            WHERE id = $2
            RETURNING photo_url
            `,
            [photoUrl, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "Profile photo updated", userId, photoUrl });
    } catch (err) {
        console.error("Upload profile error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Route to access profile photo
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            "SELECT photo_url FROM users WHERE id = $1",
            [userId]
        );

        if (!result.rows.length || !result.rows[0].photo_url) {
            return res.status(404).send("Image not found");
        }

        res.sendFile(path.join(process.cwd(), 'uploads', 'profile', result.rows[0].photo_url));
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching image");
    }
});

export default router;
