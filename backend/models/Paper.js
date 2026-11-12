import mongoose from 'mongoose';

const paperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  authors: {
    type: String,
    required: true
  },
  abstract: {
    type: String,
    required: true
  },
  journal: {
    type: String
  },
  year: {
    type: Number
  },
  doi: {
    type: String
  },
  keywords: {
    type: [String]
  },
  content: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Paper = mongoose.model('Paper', paperSchema);
