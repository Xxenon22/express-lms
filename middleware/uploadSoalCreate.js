// middleware/uploadSoalCreate.js
import multer from "multer";
import path from "path";
import fs from "fs";

// PATH ABSOLUT (STATIC) → SESUAI KEINGINAN KAMU
const BASE_UPLOAD = "/var/www/uploads/soal";

// =======================
// STORAGE
// =======================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let type = null;

        // 🔒 FIELD NAME VALIDATION
        if (file.fieldname.startsWith("pg_image_")) {
            type = "pg";
        } else if (file.fieldname.startsWith("essai_image_")) {
            type = "essai";
        }

        if (!type) {
            // ❗ jangan silent error
            return cb(
                new multer.MulterError(
                    "LIMIT_UNEXPECTED_FILE",
                    `Invalid field name: ${file.fieldname}`
                )
            );
        }

        const dir = path.join(BASE_UPLOAD, type);

        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (err) {
            return cb(err);
        }

        cb(null, dir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        const safeExt = [".jpg", ".jpeg", ".png", ".webp"];
        if (!safeExt.includes(ext)) {
            return cb(
                new Error(`Invalid image extension: ${ext}`)
            );
        }

        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, filename);
    }
});

// =======================
// FILE FILTER
// =======================
const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(
            new multer.MulterError(
                "LIMIT_UNEXPECTED_FILE",
                "Only image files are allowed"
            )
        );
    }
    cb(null, true);
};

// =======================
// EXPORT MIDDLEWARE
// =======================
export const uploadSoalCreate = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 50                 // proteksi spam upload
    }
});
