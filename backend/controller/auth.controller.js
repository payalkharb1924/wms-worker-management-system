import jwt from "jsonwebtoken";
import Farmer from "../models/Farmer.js";
import bcrypt from "bcrypt";
import { generateOTP } from "../utils/otp.js";
import { sendEmail } from "../utils/sendEmail.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email) return res.status(400).json({ msg: "Email not Entered." });
    if (!password || password.length < 5) {
      return res
        .status(400)
        .json({ msg: "Password must be atleast 5 digit long" });
    }
    let existingUser = await Farmer.findOne({ email });

    if (existingUser) {
      // 🔁 If email exists but NOT verified → resend OTP
      if (!existingUser.isEmailVerified) {
        const otp = generateOTP();

        existingUser.otp = otp;
        existingUser.otpExpiry = Date.now() + 10 * 60 * 1000;
        await existingUser.save();

        await sendEmail({
          to: email,
          subject: "Verify your email",
          html: `<p>Your OTP is <b>${otp}</b>. Valid for 10 minutes.</p>`,
        });

        return res.status(200).json({
          msg: "OTP re-sent to your email",
        });
      }

      // ❌ If already verified → block signup
      return res
        .status(400)
        .json({ msg: "Email already exists. Please login." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const newUser = await Farmer.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpiry: Date.now() + 10 * 60 * 1000, // 10 min
    });

    await sendEmail({
      to: email,
      subject: "Verify your email",
      html: `<p>Your OTP is <b>${otp}</b>. Valid for 10 minutes.</p>`,
    });

    return res.status(200).json({
      msg: "Signup successfull",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Signup Error" });
  }
};

export const verifySignupOTP = async (req, res) => {
  const { email, otp } = req.body;

  const user = await Farmer.findOne({ email });
  if (!user) return res.status(404).json({ msg: "User not found" });

  if (user.otp !== otp || user.otpExpiry < Date.now()) {
    return res.status(400).json({ msg: "Invalid or expired OTP" });
  }

  user.isEmailVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  res.json({ msg: "Email verified successfully" });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ msg: "Enter email please" });
    if (!password || password.length < 5) {
      return res
        .status(400)
        .json({ msg: "Enter valid password of atleast 5 digits" });
    }
    const user = await Farmer.findOne({ email });
    if (!user) return res.status(401).json({ msg: "Enter valid email" });

    if (!user.isEmailVerified) {
      return res.status(403).json({ msg: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Incorrect Password" });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRY || "7d",
      }
    );
    return res.status(200).json({
      msg: "Login successfull",
      user: { id: user._id, name: user.name, email: user.email },
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Login Error" });
  }
};

export const me = async (req, res) => {
  try {
    const userId = req.user.id;
    const farmer = await Farmer.findById(userId);
    if (!farmer) {
      return res.status(401).json({ msg: "Farmer not found" });
    }
    return res.status(200).json({
      msg: "Farmer Found",
      user: { id: userId, email: farmer.email, name: farmer.name },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Me Error" });
  }
};

export const verifyPassword = async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.user.id);
    if (!farmer) return res.status(404).json({ msg: "Farmer not found" });

    const match = await bcrypt.compare(req.body.password, farmer.password);

    if (!match) return res.status(400).json({ msg: "Wrong password" });

    return res.status(200).json({ msg: "Password verified" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Error verifying password" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await Farmer.findOne({ email });
  if (!user) return res.status(404).json({ msg: "User not found" });

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendEmail({
    to: email,
    subject: "Reset Password OTP",
    html: `<p>Your OTP is <b>${otp}</b></p>`,
  });

  res.json({ msg: "OTP sent to email" });
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await Farmer.findOne({ email });
  if (!user) return res.status(404).json({ msg: "User not found" });

  if (user.otp !== otp || user.otpExpiry < Date.now()) {
    return res.status(400).json({ msg: "Invalid or expired OTP" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  res.json({ msg: "Password reset successful" });
};
