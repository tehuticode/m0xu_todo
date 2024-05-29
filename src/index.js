const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Todo = require('./models/Todo');

const app = express();

app.use(express.json());
app.use(cors());

// Change path to your own MongoDB database
mongoose.connect('mongodb://localhost:27017/todo', { useNewUrlParser: true, useUnifiedTopology: true });


//Retrieves all todos from the database and sends them as a JSON response

app.get('/todos', async (req, res) => {
    const todos = await Todo.find();
    res.json(todos);



//Retrieves a specific item by its ID.});
app.get('/items/:id', async (req, res) => {
    const todo = await Todo.findById(req.params.id);
    res.json(todo);
  });

  // Handles the HTTP POST request to create a new item.
  app.post('/items', async (req, res) => {
    const newTodo = new Todo({
      title: req.body.title,
      details: req.body.details,
      due_date: req.body.due_date,
      completed: req.body.completed
    });
    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);
  });

  // Handles the HTTP DELETE request to remove an item by its ID.
  app.put('/items/:id', async (req, res) => {
    const updatedTodo = await Todo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTodo);
  });

  // Handles the HTTP PUT request to update an item by its ID.
        app.delete('/items/:id', async (req, res) => {
            await Todo.findByIdAndDelete(req.params.id);
            res.json({ message: 'Item deleted' });
        });

        // Start the server
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

});

