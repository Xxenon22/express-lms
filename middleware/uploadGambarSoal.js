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