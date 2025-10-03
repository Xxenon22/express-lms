import express from "express";
import multer from "multer";

const router = express.Router();

// konfigurasi penyimpanan
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // folder lokal
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname); // biar nama unik
    },
});

const upload = multer({ storage });

// endpoint upload file
router.post("/", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
        message: "File uploaded successfully",
        url: `/uploads/${req.file.filename}`, // ini yang dipakai frontend
    });
});

export default router;
