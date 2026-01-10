// utils/safeFile.js
import fs from "fs/promises";
import path from "path";

const ALLOWED_ROOTS = [
    "/var/www/uploads/jawaban_siswa_file",
    "/var/www/uploads/timetables",
    "/var/www/uploads/timetables-grade-x",
    "/var/www/uploads/timetables-grade-xi",
    "/var/www/uploads/soal",
];

/**
 * pastikan path aman
 */
function isPathAllowed(filePath) {
    return ALLOWED_ROOTS.some(root =>
        path.resolve(filePath).startsWith(path.resolve(root))
    );
}

/**
 * hapus file dengan aman (async, non-blocking)
 */
export async function safeUnlink(filePath) {
    if (!filePath) return;

    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join("/var/www", filePath);

    if (!isPathAllowed(absolutePath)) {
        console.error("⛔ BLOCKED DELETE (outside allowed path):", absolutePath);
        return;
    }

    try {
        await fs.access(absolutePath);
        await fs.unlink(absolutePath);
        console.log("✅ File deleted:", absolutePath);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error("❌ Failed delete:", absolutePath, err.message);
        }
    }
}
