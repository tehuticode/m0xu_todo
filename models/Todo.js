const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema({
    title: String,
    completed: Boolean,
    due_date: Date,
    details: String
});

module.exports = mongoose.model('Todo', TodoSchema);