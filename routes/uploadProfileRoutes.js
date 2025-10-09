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

// Buat folder kalau belum ada
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + ext;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error("Only JPG, JPEG, PNG files are allowed"));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // max 5MB
});

// Upload route
router.post("/", upload.single("profile"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Kirim URL relatif yang bisa diakses frontend
    const fileUrl = `/uploads/photo-profile/${req.file.filename}`;
    res.json({ imageUrl: fileUrl });
});

export default router;
