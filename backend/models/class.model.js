const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

const classEnrollmentSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'enrolled_at', updatedAt: false }
});

const ClassEnrollment = mongoose.model('ClassEnrollment', classEnrollmentSchema);
const Class = mongoose.model('Class', classSchema);

module.exports = { Class, ClassEnrollment };
