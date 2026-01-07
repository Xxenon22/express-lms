// middleware/uploadGambarSoal.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/**
 * __dirname untuk ESM
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ABSOLUTE PATH
 * /var/www/backend/express-lms/uploads/soal
 */
const UPLOAD_PATH = path.join(__dirname, "..", "uploads", "soal");

/**
 * Pastikan folder ada
 */
if (!fs.existsSync(UPLOAD_PATH)) {
    fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

/**
 * STORAGE
 */
const storage = multer.diskStorage({
    destination: (_, __, cb) => {
        cb(null, UPLOAD_PATH);
    },
    filename: (_, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

/**
 * FILTER
 */
const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        cb(new Error("INVALID_IMAGE_TYPE"), false);
    } else {
        cb(null, true);
    }
};

/**
 * EXPORT — SATU STORAGE UNTUK SEMUA
 */
export const uploadPG = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

export const uploadEssai = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

/**
 * GLOBAL ERROR HANDLER
 */
export const uploadErrorHandler = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                message: "Maximum image size is 5MB"
            });
        }
    }

    if (err.message === "INVALID_IMAGE_TYPE") {
        return res.status(400).json({
            message: "File must be an image (jpg, jpeg, png)"
        });
    }

    next(err);
};
