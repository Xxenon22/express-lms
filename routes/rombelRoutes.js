import express from "express";
import { RombelModel } from "../models/rombel.model.js";

const router = express.Router();

// =======================
// GET ALL ROMBEL
// =======================
router.get("/", async (req, res) => {
    try {
        const rombels = await RombelModel.getAll();
        res.json(rombels);
    } catch (err) {
        console.error("GET ROMBEL ERROR:", err);
        res.status(500).json({ message: "Error fetching rombel" });
    }
});

// =======================
// CREATE ROMBEL
// =======================
router.post("/", async (req, res) => {
    try {
        const { name_rombel, grade_id, jurusan_id } = req.body;

        // VALIDASI WAJIB
        if (!name_rombel || !grade_id || !jurusan_id) {
            return res.status(400).json({
                message: "name_rombel, grade_id, jurusan_id are required"
            });
        }

        const rombel = await RombelModel.create({
            name_rombel,
            grade_id,
            jurusan_id
        });

        res.json(rombel);

    } catch (err) {
        console.error("CREATE ROMBEL ERROR:", err);
        res.status(500).json({ message: "Error creating Class" });
    }
});

// =======================
// UPDATE ROMBEL
// =======================
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name_rombel, grade_id, jurusan_id } = req.body;

        if (!name_rombel || !grade_id || !jurusan_id) {
            return res.status(400).json({
                message: "name_rombel, grade_id, jurusan_id are required"
            });
        }

        const rombel = await RombelModel.update(id, {
            name_rombel,
            grade_id,
            jurusan_id
        });

        if (!rombel) {
            return res.status(404).json({ message: "Rombel not found" });
        }

        res.json(rombel);

    } catch (err) {
        console.error("UPDATE ROMBEL ERROR:", err);
        res.status(500).json({ message: "Error updating Class" });
    }
});

// =======================
// DELETE
// =======================
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const response = await RombelModel.delete(id);

        res.json(response);

    } catch (err) {
        console.error("DELETE ROMBEL ERROR:", err);
        res.status(500).json({ message: "Error deleting Class" });
    }
});

export default router;
