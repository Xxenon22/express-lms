import express from "express";
import multer from "multer";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});

// upload → return buffer + mimetype (TIDAK SIMPAN KE FOLDER)
router.post("/", upload.single("gambar"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    res.json({
        buffer: req.file.buffer.toString("base64"),
        mimetype: req.file.mimetype,
    });
});

export default router;
