import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail } from "../models/userModel.js";

// === Register (Student) ===
export const register = async (req, res) => {
    try {
        const { email, username, password, confirmPassword, role } = req.body;

        // Check for missing fields
        if (!email || !username || !password || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        //  Validate password confirmation
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // Basic password strength validation
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }

        // Check if user already exists
        const userExist = await findUserByEmail(email);
        if (userExist) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await createUser(email, username, hashedPassword, role || "student");

        // Generate JWT
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Respond success
        res.json({
            message: "Success Sign up",
            users: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
            },
            token,
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// === Register (Teacher) ===
export const registerTeacher = async (req, res) => {
    try {
        const { email, username, password, confirmPassword, role } = req.body;

        if (!email || !username || !password || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }

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
            message: "Successfully added account",
            users: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
            },
            token,
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// === Login ===
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check fields
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const users = await findUserByEmail(email);
        if (!users) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, users.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: users.id, role: users.role, username: users.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            users: {
                id: users.id,
                email: users.email,
                role: users.role,
                username: users.username,
            },
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
