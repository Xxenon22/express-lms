import nodemailer from "nodemailer";

export default async function sendEmail({ to, subject, text }) {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 2525,
            secure: false,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false },
            connectionTimeout: 10000,
            family: 4
        });

        const info = await transporter.sendMail({
            from: `"MILS" <${process.env.EMAIL}>`,
            to,
            subject,
            text: `Your verification code is: ${code}`,  // fallback
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                    <h2 style="color: #333;">MILS Verification</h2>
                    <p>Your verification code is:</p>
                    <p style="font-size: 24px; font-weight: bold; color: #007bff;">${code}</p>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `
        });

        console.log("Email sent:", info.response);
        return info;

    } catch (error) {
        console.error("SEND EMAIL ERROR:", error.message);
        throw error;
    }
}
