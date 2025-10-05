import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail } from "../models/userModel.js";

export const register = async (req, res) => {
    try {
        const { email, username, password, role } = req.body;
        const userExist = await findUserByEmail(email);
        if (userExist) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await createUser(email, username, hashedPassword, role || "student");
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Success Sign up",
            users: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
            token
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
}
    ;
export const registerTeacher = async (req, res) => {
    try {
        const { email, username, password, role } = req.body;
        const userExist = await findUserByEmail(email);
        if (userExist) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await createUser(email, username, hashedPassword, role || "teacher");
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "successfully added account",
            users: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
            token
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const users = await findUserByEmail(email);
        if (!users) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, users.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: users.id, role: users.role, username: users.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ token, users: { id: users.id, email: users.email, role: users.role, username: users.username } });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
