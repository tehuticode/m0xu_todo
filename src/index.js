
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, disconnectDB } = require('./db'); // Import the database connection
const Todo = require('./models/Todo');

const app = express();

app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// Mock users for authentication
const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 8), role: 'admin' },
  { id: 2, username: 'viewer', password: bcrypt.hashSync('viewer123', 8), role: 'viewer' }
];

// Middleware for checking authentication
const authenticate = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).send({ error: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = users.find(user => user.id === decoded.id);
    next();
  } catch (err) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

// Middleware for checking roles
const authorize = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).send({ error: 'Access denied.' });
  }
  next();
};

// Login endpoint
app.post('/login', (req, res) => {
  const user = users.find(u => u.username === req.body.username);
  if (!user || !bcrypt.compareSync(req.body.password, user.password)) {
    return res.status(400).send({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.send({ token });
});

// Create a new Todo
app.post('/todos', authenticate, authorize(['admin']), async (req, res) => {
  const newTodo = new Todo({
    title: req.body.title,
    details: req.body.details,
    due_date: req.body.due_date,
    completed: req.body.completed
  });
  try {
    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);
  } catch (err) {
    res.status(400).json({ message: 'Bad request' });
  }
});

// Read all Todos
app.get('/todos', authenticate, authorize(['admin', 'viewer']), async (req, res) => {
  try {
    const todos = await Todo.find();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Read a single Todo by ID
app.get('/todos/:id', authenticate, authorize(['admin', 'viewer']), async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Item not found' });
    res.json(todo);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a Todo by ID
app.put('/todos/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const updatedTodo = await Todo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedTodo) return res.status(404).json({ message: 'Item not found' });
    res.json(updatedTodo);
  } catch (err) {
    res.status(400).json({ message: 'Bad request' });
  }
});

// Delete a Todo by ID
app.delete('/todos/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const deletedTodo = await Todo.findByIdAndDelete(req.params.id);
    if (!deletedTodo) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await disconnectDB();
  server.close(() => {
    console.log('Server closed');
    process.exit(1);
  });
});

