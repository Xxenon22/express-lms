// middleware/uploadSoalCreate.js
import multer from "multer";
import path from "path";
import fs from "fs";

const BASE_UPLOAD = path.resolve("uploads/soal");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let type = null;

        if (file.fieldname.startsWith("pg_image_")) {
            type = "pg";
        } else if (file.fieldname.startsWith("essai_image_")) {
            type = "essai";
        }

        if (!type) {
            return cb(new Error("INVALID_UPLOAD_FIELD"));
        }

        const dir = path.join(BASE_UPLOAD, type);
        fs.mkdirSync(dir, { recursive: true });

        cb(null, dir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("INVALID_IMAGE_TYPE"));
    }
    cb(null, true);
};

export const uploadSoalCreate = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
