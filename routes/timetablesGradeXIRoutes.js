import express from "express";
import multer from "multer";
import path from "path";
import { pool } from "../config/db.js";

const router = express.Router();

// Storage untuk file PDF
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/timetables-grade-xi"); // folder penyimpanan
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Filter hanya PDF
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed"), false);
    }
};

const upload = multer({ storage, fileFilter });

/**
 * CREATE - Upload PDF
 */
router.post("/", upload.single("jadwal"), async (req, res) => {
    try {
        const file_name = req.file.filename; // hanya simpan nama file
        const result = await pool.query(
            "INSERT INTO jadwal_xi_db (file_name) VALUES ($1) RETURNING *",
            [file_name]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error upload jadwal:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * READ - Ambil semua jadwal
 */
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM jadwal_xi_db ORDER BY id DESC");
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE - Hapus jadwal
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // ambil nama file dulu
        const fileRes = await pool.query("SELECT file_name FROM jadwal_xi_db WHERE id = $1", [id]);
        if (fileRes.rowCount === 0) {
            return res.status(404).json({ message: "Timetable not found" });
        }

        const fileName = fileRes.rows[0].file_name;

        // hapus dari db
        await pool.query("DELETE FROM jadwal_xi_db WHERE id = $1", [id]);

        // hapus juga file fisiknya
        import("fs").then(fs => {
            const filePath = path.join("uploads/timetables-grade-xi", fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        res.json({ message: "Timetable deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
