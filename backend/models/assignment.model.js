const mongoose = require('mongoose');

// Assignment Schema
const assignmentSchema = new mongoose.Schema({
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Submission Schema
const submissionSchema = new mongoose.Schema({
  assignment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  file_urls: [{
    type: String
  }]
}, {
  timestamps: { createdAt: 'submitted_at', updatedAt: 'updated_at' }
});

// Grade Schema
const gradeSchema = new mongoose.Schema({
  submission_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
    unique: true
  },
  grade: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  feedback: {
    type: String,
    default: ''
  },
  graded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: { createdAt: 'graded_at', updatedAt: 'updated_at' }
});

// Class Enrollment Schema (if not already exists)
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
  timestamps: true
});

// Compound index for unique enrollment
classEnrollmentSchema.index({ class_id: 1, user_id: 1 }, { unique: true });

// Compound index for unique submission per assignment per user
submissionSchema.index({ assignment_id: 1, user_id: 1 }, { unique: true });

// Models
const Assignment = mongoose.model('Assignment', assignmentSchema);
const Submission = mongoose.model('Submission', submissionSchema);
const Grade = mongoose.model('Grade', gradeSchema);
const ClassEnrollment = mongoose.model('ClassEnrollment', classEnrollmentSchema);

module.exports = {
  Assignment,
  Submission,
  Grade,
  ClassEnrollment
};