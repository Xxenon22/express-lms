import express from "express";
import multer from "multer";

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/gambar-soal/"); // folder lokal
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const uploadGambar = multer({ storage });

// 🔹 Upload hanya simpan file
router.post("/", uploadGambar.single("gambar"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
        message: "File uploaded successfully",
        filePath: req.file.filename, // relative path untuk DB
    });
});

export default router;
