// middleware/uploadGambarSoal.js
import multer from "multer";
import path from "path";
import fs from "fs";

const createStorage = (folder) => {
    const uploadPath = path.join("uploads", "soal", folder);

    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    return multer.diskStorage({
        destination: (_, __, cb) => cb(null, uploadPath),
        filename: (_, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        }
    });
};

const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        cb(new Error("INVALID_IMAGE_TYPE"), false);
    } else {
        cb(null, true);
    }
};

export const uploadPG = multer({
    storage: createStorage("pg"),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

export const uploadEssai = multer({
    storage: createStorage("essai"),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

/**
 * 🔥 GLOBAL ERROR HANDLER UNTUK MULTER
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
