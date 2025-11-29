import jwt from "jsonwebtoken";
import Farmer from "../models/Farmer.js";
import bcrypt from "bcrypt";

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email) return res.status(400).json({ msg: "Email not Entered." });
    if (!password || password.length < 5) {
      return res
        .status(400)
        .json({ msg: "Password must be atleast 5 digit long" });
    }
    let existingUser = await Farmer.findOne({ email: email });
    if (existingUser) {
      return res
        .status(400)
        .json({ msg: "Email already exists, Please Login." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await Farmer.create({
      name,
      email,
      password: hashedPassword,
    });
    return res.status(200).json({
      msg: "Signup successfull",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Signup Error" });
  }
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
    const match = await bcrypt.compare(req.body.password, farmer.password);

    if (!match) return res.status(400).json({ msg: "Wrong password" });

    return res.status(200).json({ msg: "Password verified" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ msg: "Error verifying password" });
  }
};
