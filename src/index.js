const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { connectDB, disconnectDB } = require('./db'); // Import the database connection
const Todo = require('./models/Todo');

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: '*',
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Authorization, Content-Type'
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

app.use((req, res, next) => {
  console.log(`${req.method} request for '${req.url}'`);
  next();
});

// Connect to MongoDB
connectDB();

// Swagger setup
require('./swagger')(app);

// Mock users for authentication
const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('admin123', 8), role: 'admin' },
  { id: 2, username: 'viewer', password: bcrypt.hashSync('viewer123', 8), role: 'viewer' }
];

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'user' }
});

const User = mongoose.model('User', userSchema);

// In-memory token blacklist
let tokenBlacklist = [];

// Middleware for checking authentication
const authenticate = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).send({ error: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer ', '');
  if (tokenBlacklist.includes(token)) {
    return res.status(401).send({ error: 'Token has been logged out' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
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

// User Sign-Up Endpoint
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, role: 'user' });
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(400).send(`Error registering user: ${error.message}`);
  }
});

// User Sign-Up Endpoint
/**
 * @swagger
 * /signup:
 *   post:
 *     summary: User sign-up
 *     description: Register a new user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Error registering user
 */

// User Sign-In Endpoint
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).send('Invalid credentials');
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(400).send('Error logging in');
  }
});

// User Sign-In Endpoint
/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return a JWT token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       400:
 *         description: Invalid credentials
 */

// User Sign-Out Endpoint
app.post('/logout', authenticate, (req, res) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  tokenBlacklist.push(token);
  res.send('User logged out successfully');
});

// User Sign-Out Endpoint
/**
 * @swagger
 * /logout:
 *   post:
 *     summary: User logout
 *     description: Log out the user and invalidate the token.
 *     responses:
 *       200:
 *         description: Successful logout
 */

// Create a new Todo (only admin can create)
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

// Create a new Todo (only admin can create)
/**
 * @swagger
 * /todos:
 *   post:
 *     summary: Create a new Todo
 *     description: Create a new Todo (only admin can create).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               details:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date
 *               completed:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Todo created successfully
 *       400:
 *         description: Bad request
 *   get:
 *     summary: Get all Todos
 *     description: Retrieve all Todos (admin and viewer can read).
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Server error
 */


// Read all Todos (admin and viewer can read)
app.get('/todos', authenticate, authorize(['admin', 'viewer']), async (req, res) => {
  console.log('Accessing todos');
  try {
    const todos = await Todo.find();
    res.json(todos);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /todos:
 *   get:
 *     summary: Get all Todos
 *     description: Retrieve all Todos (admin and viewer can read).
 *     responses:
 *       200:
 *         description: Successful operation
 *       500:
 *         description: Server error
 */

 // Read a single Todo by ID (admin and viewer can read)
app.get('/todos/:id', authenticate, authorize(['admin', 'viewer']), async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) {
      console.log(`Todo with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(todo);
  } catch (err) {
    console.error('Error fetching todo by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /todos/{id}:
 *   get:
 *     summary: Get a single Todo
 *     description: Retrieve a single Todo by ID (admin and viewer can read).
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful operation
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */


// Update a Todo by ID (only admin can update)
app.put('/todos/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const updatedTodo = await Todo.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedTodo) return res.status(404).json({ message: 'Item not found' });
    res.json(updatedTodo);
  } catch (err) {
    res.status(400).json({ message: 'Bad request' });
  }
});

/**
 * @swagger
 * /todos/{id}:
 *   put:
 *     summary: Update a Todo
 *     description: Update a Todo by ID (only admin can update).
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               details:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Todo updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Item not found
 */


// Delete a Todo by ID (only admin can delete)
app.delete('/todos/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const deletedTodo = await Todo.findByIdAndDelete(req.params.id);
    if (!deletedTodo) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /todos/{id}:
 *   delete:
 *     summary: Delete a Todo
 *     description: Delete a Todo by ID (only admin can delete).
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted
 *       404:
 *         description: Item not found
 *       500:
 *         description: Server error
 */


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
