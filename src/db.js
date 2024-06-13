const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from the root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB disconnected successfully');
  } catch (err) {
    console.error('MongoDB disconnection error:', err);
  }
};

module.exports = { connectDB, disconnectDB };
