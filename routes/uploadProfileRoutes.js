import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder upload
const uploadDir = path.join(__dirname, "../uploads/photo-profile");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    fileFilter(req, file, cb) {
        const allowed = /jpeg|jpg|png/;
        const valid = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
        cb(valid ? null : new Error("Only JPG, JPEG, PNG allowed"), valid);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

//  UPDATE photo profile
router.put("/", upload.single("profile"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const newFileUrl = `/uploads/photo-profile/${req.file.filename}`;
        const { oldImagePath } = req.body;

        // Hapus foto lama (kalau ada)
        if (oldImagePath) {
            const oldFilePath = path.join(__dirname, "..", oldImagePath);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log("Old profile photo deleted:", oldFilePath);
            }
        }

        res.json({ imageUrl: newFileUrl });
    } catch (err) {
        console.error("Error updating profile photo:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
