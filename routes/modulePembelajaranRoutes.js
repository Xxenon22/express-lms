import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
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
            `
            SELECT 
                mp.id,
                mp.materi_uuid,
                mp.judul,
                mp.video_url,
                mp.deskripsi,
                mp.guru_id,
                mp.bank_soal_id,
                mp.judul_penugasan,
                mp.link_zoom,
                mp.kelas_id,
                mp.pass_code,
                mp.created_at,

                CONCAT(
                    COALESCE(gl.grade_lvl, ''),
                    ' ',
                    COALESCE(mj.nama_jurusan, ''),
                    ' ',
                    COALESCE(nr.number, ''),
                    ' - ',
                    COALESCE(dm.nama_mapel, '')
                ) AS kelas_nama

            FROM module_pembelajaran mp
            LEFT JOIN kelas k ON k.id = mp.kelas_id
            LEFT JOIN rombel r ON k.rombel_id = r.id
            LEFT JOIN number_rombel nr ON r.name_rombel = nr.id
            LEFT JOIN grade_level gl ON r.grade_id = gl.id
            LEFT JOIN jurusan mj ON r.jurusan_id = mj.id
            LEFT JOIN db_mapel dm ON k.id_mapel = dm.id

            WHERE mp.guru_id = $1
            ORDER BY mp.created_at DESC
            `,
            [guruId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("GET module pembelajaran:", err);
        res.status(500).json({ message: "Gagal ambil module" });
    }
});

// POST tambah module
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
    try {
        const materiUuid = uuidv4();
        const {
            judul,
            video_url,
            deskripsi,
            guru_id,
            bank_soal_id,
            judul_penugasan,
            link_zoom,
            pass_code,
            kelas_ids // ⬅️ ARRAY
        } = req.body;

        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "PDF file is required" });
        }

        if (!kelas_ids || !kelas_ids.length) {
            return res.status(400).json({ message: "kelas_ids is required" });
        }

        const inserted = [];

        for (const kelasId of Array.isArray(kelas_ids) ? kelas_ids : [kelas_ids]) {
            const result = await pool.query(
                `INSERT INTO module_pembelajaran
                (
                    materi_uuid,
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
                ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                RETURNING id`,
                [
                    materiUuid,
                    judul,
                    video_url,
                    deskripsi,
                    guru_id,
                    bank_soal_id,
                    judul_penugasan,
                    link_zoom,
                    kelasId,
                    pass_code,
                    file.buffer,       // BYTEA
                    file.originalname,
                    file.mimetype
                ]
            );

            inserted.push(result.rows[0]);
        }

        console.log("FILE RECEIVED (ONCE):", {
            name: file.originalname,
            size: file.size,
            mime: file.mimetype
        });

        res.json({
            message: "Material saved successfully",
            total_kelas: inserted.length
        });

    } catch (err) {
        console.error("POST module pembelajaran:", err);
        res.status(500).json({ message: err.message });
    }
});


// UPDATE materi by id
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { judul, video_url, deskripsi, link_zoom, pass_code } = req.body;

        const result = await pool.query(
            `
            UPDATE module_pembelajaran
            SET judul=$1,
                video_url=$2,
                deskripsi=$3,
                link_zoom=$4,
                pass_code=$5
            WHERE id=$6
            RETURNING *
            `,
            [judul, video_url, deskripsi, link_zoom, pass_code, id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: "Material not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("FAST UPDATE ERROR:", err);
        res.status(500).json({ message: "Gagal update materi" });
    }
});


// GET materi by kelasId (hanya yang BELUM selesai)
router.get("/kelas/:kelasId", verifyToken, async (req, res) => {
    try {
        const { kelasId } = req.params;
        const userId = req.users.id;
        const guruId = req.users.id;   // guru (materi)

        const result = await pool.query(
            `
            SELECT 
                m.id,
                m.judul,
                m.video_url,
                m.deskripsi,
                m.guru_id,
                m.bank_soal_id,
                m.judul_penugasan,
                m.link_zoom,
                m.kelas_id,
                m.pass_code,
                m.created_at,
                jm.status_selesai
            FROM module_pembelajaran m
            LEFT JOIN progress_materi jm 
                ON jm.materi_id = m.id 
               AND jm.user_id = $2
            WHERE m.kelas_id = $1
            AND m.guru_id = $3
            ORDER BY m.created_at DESC
            `,
            [kelasId, userId, guruId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("GET /module-pembelajaran/kelas/:kelasId", error);
        res.status(500).json({ message: "Failed retrieve Module by id" });
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


// ✅ PDF HARUS DI ATAS
router.get("/:id/pdf", async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "SELECT file_pdf, file_name, file_mime FROM module_pembelajaran WHERE id=$1",
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ message: "File not found" });
        }

        const file = result.rows[0];

        res.setHeader("Content-Type", file.file_mime);
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${file.file_name}"`
        );

        res.send(file.file_pdf);
    } catch (err) {
        console.error("PDF error:", err);
        res.status(500).json({ message: "Gagal load PDF" });
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
router.get("/:soalId", async (req, res) => {
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

router.put("/:id/pdf", verifyToken, upload.single("file"), async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "PDF file required" });
        }

        const result = await pool.query(
            `
            UPDATE module_pembelajaran
            SET file_pdf=$1,
                file_name=$2,
                file_mime=$3
            WHERE id=$4
            RETURNING id
            `,
            [file.buffer, file.originalname, file.mimetype, id]
        );

        res.json({ message: "PDF updated successfully" });
    } catch (err) {
        console.error("PDF UPDATE ERROR:", err);
        res.status(500).json({ message: "Gagal update PDF" });
    }
});

// GET materi history siswa
router.get("/kelas/:kelasId/history", verifyToken, async (req, res) => {
    const { kelasId } = req.params;
    const userId = req.users.id;

    const result = await pool.query(`
        SELECT 
            m.*,
            p.refleksi,
            p.status_selesai
        FROM module_pembelajaran m
        JOIN progress_materi p 
            ON p.materi_id = m.id
        WHERE m.kelas_id = $1
          AND p.user_id = $2
          AND p.status_selesai = true
        ORDER BY p.updated_at DESC
    `, [kelasId, userId]);

    res.json(result.rows);
});

router.put("/:id/kelas", verifyToken, async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { kelas_ids } = req.body;

        if (!Array.isArray(kelas_ids) || kelas_ids.length === 0) {
            return res.status(400).json({
                message: "kelas_ids harus berupa array dan tidak boleh kosong"
            });
        }

        await client.query("BEGIN");

        // 1️⃣ Ambil data materi lama (sebagai template)
        const materiRes = await client.query(
            `SELECT * FROM module_pembelajaran WHERE id = $1`,
            [id]
        );

        if (!materiRes.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Materi tidak ditemukan" });
        }

        const materi = materiRes.rows[0];

        // 2️⃣ Hapus semua materi dengan judul & guru yang sama
        await client.query(
            `
            DELETE FROM module_pembelajaran
            WHERE judul = $1 AND guru_id = $2
            `,
            [materi.judul, materi.guru_id]
        );

        // 3️⃣ Insert ulang berdasarkan kelas baru
        const inserted = [];

        for (const kelasId of kelas_ids) {
            const result = await client.query(
                `
                INSERT INTO module_pembelajaran
                (
                    materi_uuid,
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
                ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                RETURNING *
                `,
                [
                    materi.materi_uuid,
                    materi.judul,
                    materi.video_url,
                    materi.deskripsi,
                    materi.guru_id,
                    materi.bank_soal_id,
                    materi.judul_penugasan,
                    materi.link_zoom,
                    kelasId,
                    materi.pass_code,
                    materi.file_pdf,
                    materi.file_name,
                    materi.file_mime
                ]
            );

            inserted.push(result.rows[0]);
        }

        await client.query("COMMIT");

        res.json({
            message: "Kelas materi berhasil diperbarui",
            total: inserted.length,
            data: inserted
        });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("UPDATE KELAS ERROR:", err);
        res.status(500).json({ message: "Gagal update kelas materi" });
    } finally {
        client.release();
    }
});

export default router;
