const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize:              100,   // allow up to 100 concurrent DB operations
      minPoolSize:              5,     // keep at least 5 connections warm
      serverSelectionTimeoutMS: 8000,  // fail fast if MongoDB is unreachable
      socketTimeoutMS:          45000, // cut off idle sockets after 45s
      connectTimeoutMS:         10000,
      heartbeatFrequencyMS:     10000,
      retryWrites:              true,
      family:                   4      // force IPv4 (avoids dual-stack hangs)
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected — will retry automatically.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
