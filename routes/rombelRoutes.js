import express from "express";
import { RombelModel } from "../models/rombelModel.js";

const router = express.Router();

// Get all rombel with grade
router.get("/", async (req, res) => {
    try {
        const rombels = await RombelModel.getAll();
        res.json(rombels);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching rombel" });
    }
});

// Create
router.post("/", async (req, res) => {
    try {
        const { name_rombel, jurusan_id, grade_id } = req.body;
        const rombel = await RombelModel.create(name_rombel, jurusan_id, grade_id);
        res.json(rombel);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating Class" });
    }
});

// Update
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name_rombel, jurusan_id, grade_id } = req.body;
        const rombel = await RombelModel.update(id, name_rombel, jurusan_id, grade_id);
        res.json(rombel);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error updating Class" });
    }
});

// Delete
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const response = await RombelModel.delete(id);
        res.json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting Class" });
    }
});

export default router;
