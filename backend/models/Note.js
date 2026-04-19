import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  tags: {
    type: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 自动更新 updatedAt
noteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Note = mongoose.model('Note', noteSchema);
