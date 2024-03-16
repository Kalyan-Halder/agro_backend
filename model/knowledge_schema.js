const mongoose = require('mongoose');

// Define the schema for the knowledge base
const knowledgeBaseSchema = new mongoose.Schema({
  questions: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }]
});

// Create a model based on the schema
const Knowledge = mongoose.model('Knowledge', knowledgeBaseSchema);

module.exports = Knowledge;