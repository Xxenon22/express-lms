// routes/moduleRoutes.js
import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();


const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            cb(new Error("Only PDF allowed"), false);
        } else {
            cb(null, true);
        }
    }
});

// GET semua module (filter by guru_id)
router.get("/", verifyToken, async (req, res) => {
    try {
        const guruId = req.users.id;
        const result = await pool.query(
            `SELECT id, judul, video_url, deskripsi, guru_id,
                    bank_soal_id, judul_penugasan, link_zoom,
                    kelas_id, pass_code, created_at
             FROM module_pembelajaran
             WHERE guru_id = $1
             ORDER BY created_at DESC`,
            [guruId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
        console.error("error get the data module pembelajaran :", err)
    }
});

// POST tambah module
router.post("/", upload.single("file"), async (req, res) => {
    try {
        const {
            judul,
            video_url,
            deskripsi,
            guru_id,
            bank_soal_id,
            judul_penugasan,
            link_zoom,
            kelas_id,
            pass_code
        } = req.body;

        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "PDF file is required" });
        }

        const result = await pool.query(
            `INSERT INTO module_pembelajaran
            (
                judul,
                video_url,
                deskripsi,
                guru_id,
                bank_soal_id,
                judul_penugasan,
                link_zoom,
                kelas_id,
                pass_code,
                file_pdf,
                file_name,
                file_mime
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            RETURNING *`,
            [
                judul,
                video_url,
                deskripsi,
                guru_id,
                bank_soal_id,
                judul_penugasan,
                link_zoom,
                kelas_id,
                pass_code,
                file.buffer,       // ✅ BYTEA
                file.originalname, // nama file
                file.mimetype      // application/pdf
            ]
        );

        res.json(result.rows[0]);
        console.log("FILE RECEIVED:", {
            name: file?.originalname,
            size: file?.size,
            mime: file?.mimetype,
        });

    } catch (err) {
        console.error("POST module pembelajaran:", err);
        res.status(500).json({ message: err.message });
    }
});

// UPDATE materi by id
router.put("/:id", verifyToken, upload.single("file"), async (req, res) => {
    try {
        const { id } = req.params;
        const { judul, video_url, deskripsi, link_zoom, pass_code } = req.body;
        const file = req.file;

        let query;
        let values;

        if (file) {
            // UPDATE DENGAN FILE BARU
            query = `
                UPDATE module_pembelajaran
                SET judul=$1,
                    video_url=$2,
                    deskripsi=$3,
                    link_zoom=$4,
                    pass_code=$5,
                    file_pdf=$6,
                    file_name=$7,
                    file_mime=$8
                WHERE id=$9
                RETURNING *
            `;
            values = [
                judul,
                video_url,
                deskripsi,
                link_zoom,
                pass_code,
                file.buffer,
                file.originalname,
                file.mimetype,
                id
            ];
        } else {
            // UPDATE TANPA GANTI PDF
            query = `
                UPDATE module_pembelajaran
                SET judul=$1,
                    video_url=$2,
                    deskripsi=$3,
                    link_zoom=$4,
                    pass_code=$5
                WHERE id=$6
                RETURNING *
            `;
            values = [
                judul,
                video_url,
                deskripsi,
                link_zoom,
                pass_code,
                id
            ];
        }

        const result = await pool.query(query, values);

        if (!result.rows.length) {
            return res.status(404).json({ message: "Material not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("UPDATE materi error:", error);
        res.status(500).json({ message: "Gagal update materi" });
    }
});

// GET materi by kelasId (hanya yang BELUM selesai)
router.get("/kelas/:kelasId", verifyToken, async (req, res) => {
    try {
        const { kelasId } = req.params;
        const userId = req.users.id; // ambil dari token user yang login

        const result = await pool.query(
            `SELECT 
                m.*, 
                b.id AS bank_soal_id, 
                b.judul_penugasan AS bank_soal_nama,
                u.photo_profile AS guru_foto
                FROM module_pembelajaran m 
             LEFT JOIN bank_soal b ON m.bank_soal_id = b.id
             LEFT JOIN users u ON m.guru_id = u.id
             LEFT JOIN progress_materi jm ON jm.materi_id = m.id AND jm.user_id = $2
             WHERE m.kelas_id = $1
               AND (jm.status_selesai IS NULL OR jm.status_selesai = false)
             ORDER BY m.created_at DESC`,
            [kelasId, userId]
        );

        res.json(result.rows || []);
    } catch (error) {
        console.error("GET /module-pembelajaran/kelas/:kelasId", error);
        res.status(500).json({ message: "Gagal ambil modul berdasarkan kelas" });
    }
});

// DELETE materi by id
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM module_pembelajaran WHERE id=$1", [id]);
        res.json({ message: "Materi berhasil dihapus" });
    } catch (error) {
        console.error("DELETE /module-pembelajaran/:id", error);
        res.status(500).json({ message: "Failed to delted material" });
    }
});

// GET semua materi untuk siswa berdasarkan kelas yang diikuti
router.get("/siswa/:id", async (req, res) => {
    const siswaId = req.params.id;

    try {
        const query = `
            SELECT 
                mp.id,
                mp.judul_penugasan,
                mp.kelas_id,
                mp.bank_soal_id,
                mp.created_at,
                r.name_rombel,
                m.nama_mapel,
                p.pdf_selesai,
                p.video_selesai,
                j.nilai,
                u.photo_profile AS guru_foto
            FROM module_pembelajaran mp
            INNER JOIN kelas k ON k.id = mp.kelas_id
            INNER JOIN rombel r ON r.id = k.rombel_id
            INNER JOIN db_mapel m ON m.id = k.id_mapel
            INNER JOIN kelas_diikuti kd ON kd.kelas_id = k.id
            LEFT JOIN users u ON u.id = mp.guru_id
            LEFT JOIN progress_materi p ON p.materi_id = mp.id AND p.user_id = $1
            LEFT JOIN jawaban_siswa j 
                ON j.bank_soal_id = mp.bank_soal_id AND j.user_id = $1
            WHERE kd.user_id = $1
            ORDER BY mp.created_at DESC
        `;

        const { rows } = await pool.query(query, [siswaId]);
        res.json(rows);
    } catch (error) {
        console.error("Error fetch materi siswa:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


// GET MATERI BY ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT id, judul, video_url, deskripsi, guru_id, bank_soal_id,
                    judul_penugasan, link_zoom, kelas_id, pass_code, created_at
             FROM module_pembelajaran
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Material not found" });
        }

        res.json(result.rows[0]); // ✅ kirim satu objek, bukan array
    } catch (error) {
        console.error("SELECT /module-pembelajaran/:id", error);
        res.status(500).json({ message: "Failed to retrieve material by ID" });
    }
});

// Ambil 1 module pembelajaran berdasarkan soalId
router.get("/soal/:soalId", async (req, res) => {
    try {
        const { soalId } = req.params;
        const result = await pool.query(
            `SELECT 
                mp.id,
                mp.kelas_id,
                mp.judul_penugasan,
                mp.created_at,
                bs.id AS bank_soal_id
             FROM module_pembelajaran mp
             LEFT JOIN bank_soal bs ON mp.bank_soal_id = bs.id
             WHERE mp.id = $1`,
            [soalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Questions not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error GET /module-pembelajaran/:soalId:", error);
        res.status(500).json({ error: "Failed to retrieve Questions" });
    }
});

router.get("/:id/pdf", async (req, res) => {
    try {
        const { id } = req.params;
        // console.log("PDF REQUEST ID:", req.params.id);
        const result = await pool.query(
            "SELECT file_pdf, file_name, file_mime FROM module_pembelajaran WHERE id=$1",
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: "File not found" });
        }

        const file = result.rows[0];

        res.setHeader("Content-Type", file.file_mime);
        res.setHeader("Content-Disposition", `inline; filename="${file.file_name}"`);
        res.send(file.file_pdf);
    } catch (err) {
        console.error("PDF error:", err);
        res.status(500).json({ message: "Gagal load PDF" });
    }
});




export default router;
