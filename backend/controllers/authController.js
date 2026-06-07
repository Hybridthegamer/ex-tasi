const User = require('../models/User');
const Institution = require('../models/Institution');
const jwt = require('jsonwebtoken');
const { slugify } = require('../utils/codeGenerator');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, institutionName } = req.body;

    if (!name || !email || !password || !role || !institutionName) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!['tutor', 'student'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Find or create institution by slug
    const slug = slugify(institutionName);
    let institution = await Institution.findOne({ slug });
    if (!institution) {
      institution = await Institution.create({ name: institutionName.trim(), slug });
    }

    const user = await User.create({ name: name.trim(), email, password, role, institution: institution._id });

    // Add user to institution
    if (role === 'tutor') {
      institution.tutors.addToSet(user._id);
    } else {
      institution.students.addToSet(user._id);
    }
    await institution.save();

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: { id: institution._id, name: institution.name }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate('institution', 'name slug');
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution
          ? { id: user.institution._id, name: user.institution.name }
          : null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('institution', 'name slug');

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      institution: user.institution
        ? { id: user.institution._id, name: user.institution.name }
        : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};