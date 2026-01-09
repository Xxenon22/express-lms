import express from "express";
import { pool } from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET semua forum
router.get("/", verifyToken, async (req, res) => {
    const guruId = req.users.id
    try {
        const result = await pool.query(`
      SELECT 
            f.id,
            f.nama_grup,
            f.link_grup,
            u.username AS guru_name,
            r.name_rombel,
            g.grade_lvl,
            mj.nama_jurusan AS major 
            m.nama_mapel,
            k.link_wallpaper_kelas
        FROM forum_discus f
        JOIN users u ON f.guru_id = u.id
        JOIN kelas k ON f.kelas_id = k.id
        JOIN rombel r ON k.rombel_id = r.id
        JOIN grade_level g ON r.grade_id = g.id
        JOIN db_mapel m ON k.id_mapel = m.id
        LEFT JOIN jurusan mj ON k.kelas_id = mj.id
        WHERE f.guru_id = $1
    `, [guruId]);

        res.json(result.rows);
    } catch (err) {
        console.error("GET /forum-discuss:", err);
        res.status(500).json({ message: "Failed to retrieve forum data" });
    }
});

// POST forum baru
router.post("/", async (req, res) => {
    try {
        const data = req.body;

        // frontend kirim array (inserts)
        if (!Array.isArray(data)) {
            return res.status(400).json({ message: "Data must be array" });
        }

        const inserted = [];
        for (const d of data) {
            const result = await pool.query(
                `INSERT INTO forum_discus (nama_grup, link_grup, guru_id, kelas_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
                [d.nama_grup, d.link_grup, d.guru_id, d.kelas_id]
            );
            inserted.push(result.rows[0]);
        }
        res.json(inserted);
    } catch (err) {
        console.error("POST /forum-discuss:", err);
        res.status(500).json({ message: "Failed to save forum" });
    }
});

// GET forum_discuss by kelas_id
router.get("/:kelasId", verifyToken, async (req, res) => {
    const { kelasId } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                f.id,
                f.nama_grup,
                f.link_grup,
                u.username AS guru_name,
                r.name_rombel,
                g.grade_lvl,
                m.nama_mapel,
                k.link_wallpaper_kelas
            FROM forum_discus f
            JOIN users u ON f.guru_id = u.id
            JOIN kelas k ON f.kelas_id = k.id
            JOIN rombel r ON k.rombel_id = r.id
            JOIN grade_level g ON r.grade_id = g.id
            JOIN db_mapel m ON k.id_mapel = m.id
            WHERE f.kelas_id = $1
            ORDER BY f.id DESC
            `,
            [kelasId]
        );
        if (result.rowCount === 0) {
            return res.json([]); // balikin array kosong, bukan error
        }


        res.json(result.rows);
    } catch (err) {
        console.error("GET /forum-discuss/:kelasId:", err);
        res.status(500).json({ message: "Failed to retrieve discussion forum based on class" });
    }
});

// DELETE forum by id
// router.delete("/:id", async (req, res) => {
//     try {
//         const { id } = req.params;
//         await pool.query("DELETE FROM forum_discus WHERE id=$1", [id]);
//         res.json({ message: "Forum discuss deleted successfully" });
//     } catch (error) {
//         console.error("failed to delete data:", error)
//     }
// });


router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log("Delete forum with ID:", id); // DEBUG

        if (!id) {
            return res.status(400).json({ message: "ID is required" });
        }

        const result = await pool.query(
            "DELETE FROM forum_discus WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Forum discuss not found" });
        }

        res.json({ message: "Forum discuss deleted successfully", deleted: result.rows[0] });
    } catch (error) {
        console.error("Error deleting forum discuss:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;