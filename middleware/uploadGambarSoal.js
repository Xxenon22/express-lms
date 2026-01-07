// middleware/uploadGambarSoal.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ABSOLUTE PATH (AMAN)
const BASE_UPLOAD_PATH = path.join(
    __dirname,
    "..",
    "uploads",
    "soal"
);

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let sub = "general";

        if (file.fieldname.startsWith("pg_")) sub = "pg";
        if (file.fieldname.startsWith("essai_")) sub = "essai";

        const target = path.join(BASE_UPLOAD_PATH, sub);
        ensureDir(target);

        cb(null, target);
    },
    filename: (_, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const fileFilter = (_, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("INVALID_IMAGE_TYPE"));
    }
    cb(null, true);
};

export const uploadSoal = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});
