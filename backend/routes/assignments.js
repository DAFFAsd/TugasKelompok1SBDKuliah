const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadFile } = require('../config/cloudinary');
const { getDb, ObjectId } = require('../db');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Consider using memoryStorage for Cloudinary

// Maximum number of files allowed per upload
const MAX_FILES = 5;

// Helper function to get DB instance
const db = () => getDb();

// Get all assignments for a class
router.get('/class/:classId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.classId)) {
      return res.status(400).json({ message: 'Invalid class ID format' });
    }
    const classId = new ObjectId(req.params.classId);

    const assignments = await db().collection('assignments').aggregate([
      { $match: { class_id: classId } },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          description: 1,
          deadline: 1,
          class_id: 1,
          created_by: 1,
          createdAt: 1,
          updatedAt: 1,
          creator_name: '$creator.username'
        }
      },
      { $sort: { deadline: 1 } }
    ]).toArray();

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming assignments for the current user
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const userId = new ObjectId(req.user.id); // Assuming req.user.id is the string representation of ObjectId

    // Get classes the user is enrolled in
    const enrollments = await db().collection('class_enrollments').find({ user_id: userId }).toArray();
    if (enrollments.length === 0) {
      return res.json([]);
    }
    const enrolledClassIds = enrollments.map(e => e.class_id);

    let pipeline = [
      {
        $match: {
          class_id: { $in: enrolledClassIds },
          deadline: { $gt: new Date() }
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'class_id',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
    ];

    if (req.user.role === 'praktikan') {
      pipeline.push(
        {
          $lookup: {
            from: 'submissions',
            let: { assignmentId: '$_id', userId: userId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$assignment_id', '$$assignmentId'] },
                      { $eq: ['$user_id', '$$userId'] }
                    ]
                  }
                }
              }
            ],
            as: 'submission'
          }
        },
        { $match: { submission: { $size: 0 } } } // Only assignments not submitted
      );
    }

    pipeline.push(
      { $sort: { deadline: 1 } },
      { $limit: limit },
      {
        $project: {
          title: 1,
          description: 1,
          deadline: 1,
          class_id: 1,
          createdAt: 1,
          updatedAt: 1,
          class_title: '$classInfo.title',
          // submission: 0 // Exclude submission array from final output if not needed
        }
      }
    );

    const assignments = await db().collection('assignments').aggregate(pipeline).toArray();
    res.json(assignments);

  } catch (error) {
    console.error('Error fetching upcoming assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get an assignment by ID
router.get('/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }
    const assignmentId = new ObjectId(req.params.id);

    const assignment = await db().collection('assignments').aggregate([
      { $match: { _id: assignmentId } },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'classes',
          localField: 'class_id',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          description: 1,
          deadline: 1,
          class_id: 1,
          created_by: 1,
          createdAt: 1,
          updatedAt: 1,
          creator_name: '$creator.username',
          class_title: '$classInfo.title'
        }
      }
    ]).next(); // Use next() for findOne equivalent in aggregation

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new assignment (aslab only)
router.post('/', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const { class_id, title, description, deadline } = req.body;

    if (!class_id || !title || !description || !deadline) {
      return res.status(400).json({ message: 'Class ID, title, description, and deadline are required' });
    }
    if (!ObjectId.isValid(class_id)) {
      return res.status(400).json({ message: 'Invalid Class ID format' });
    }

    const classExists = await db().collection('classes').findOne({ _id: new ObjectId(class_id) });
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const newAssignment = {
      class_id: new ObjectId(class_id),
      title,
      description,
      deadline: new Date(deadline),
      created_by: new ObjectId(req.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db().collection('assignments').insertOne(newAssignment);
    const insertedAssignment = await db().collection('assignments').findOne({ _id: result.insertedId });

    res.status(201).json(insertedAssignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an assignment (aslab only)
router.put('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const { title, description, deadline } = req.body;
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }
    const assignmentId = new ObjectId(req.params.id);

    if (!title || !description || !deadline) {
      return res.status(400).json({ message: 'Title, description, and deadline are required' });
    }

    const assignment = await db().collection('assignments').findOne({ _id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // In MongoDB, req.user.id should be a string, convert assignment.created_by to string for comparison
    if (assignment.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to update this assignment' });
    }

    const updateData = {
      title,
      description,
      deadline: new Date(deadline),
      updatedAt: new Date()
    };

    const result = await db().collection('assignments').updateOne(
      { _id: assignmentId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Assignment not found' });
    }
    const updatedAssignment = await db().collection('assignments').findOne({ _id: assignmentId });
    res.json(updatedAssignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an assignment (aslab only)
router.delete('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }
    const assignmentId = new ObjectId(req.params.id);

    const assignment = await db().collection('assignments').findOne({ _id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to delete this assignment' });
    }

    // Also delete related submissions and grades
    await db().collection('submissions').deleteMany({ assignment_id: assignmentId });
    // Assuming grades are linked to submissions, they might be deleted via cascade or need explicit deletion if linked to assignments
    // For now, let's assume submissions deletion is enough or grades are embedded/handled elsewhere.

    const result = await db().collection('assignments').deleteOne({ _id: assignmentId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Assignment not found or already deleted' });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit an assignment (praktikan only)
router.post('/:id/submit', authenticate, authorize(['praktikan']), upload.array('files', MAX_FILES), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }
    const assignmentId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.id);

    const { content, existingFiles: existingFilesJson } = req.body; // existingFiles is expected to be JSON string
    const newFiles = req.files;

    const assignment = await db().collection('assignments').findOne({ _id: assignmentId });
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (new Date() > new Date(assignment.deadline)) {
      return res.status(400).json({ message: 'Deadline has passed' });
    }

    let currentFileUrls = [];
    if (existingFilesJson) {
      try {
        currentFileUrls = JSON.parse(existingFilesJson);
        if (!Array.isArray(currentFileUrls)) currentFileUrls = [];
      } catch (e) {
        console.warn('Error parsing existingFiles JSON:', e);
        currentFileUrls = []; // Reset if parsing fails
      }
    }
    
    let uploadedFileUrls = [];
    if (newFiles && newFiles.length > 0) {
      if (currentFileUrls.length + newFiles.length > MAX_FILES) {
        return res.status(400).json({
          message: `Cannot add ${newFiles.length} new files. Maximum ${MAX_FILES} files allowed. Currently ${currentFileUrls.length} files.`
        });
      }
      for (const file of newFiles) {
        const uploadResult = await uploadFile(file, 'submissions'); // Ensure uploadFile is compatible
        uploadedFileUrls.push(uploadResult.secure_url || uploadResult.url); // Prefer secure_url
      }
    }
    
    const finalFileUrls = [...currentFileUrls, ...uploadedFileUrls];

    const submissionData = {
      assignment_id: assignmentId,
      user_id: userId,
      content: content || '',
      fileUrls: finalFileUrls, // Storing as an array of strings
      submittedAt: new Date(),
      updatedAt: new Date()
    };

    const existingSubmission = await db().collection('submissions').findOne({
      assignment_id: assignmentId,
      user_id: userId
    });

    let savedSubmission;
    if (existingSubmission) {
      const result = await db().collection('submissions').updateOne(
        { _id: existingSubmission._id },
        { $set: { content: submissionData.content, fileUrls: submissionData.fileUrls, updatedAt: new Date() } }
      );
      savedSubmission = await db().collection('submissions').findOne({ _id: existingSubmission._id });
      res.json({ message: 'Submission updated', submission: savedSubmission });
    } else {
      const result = await db().collection('submissions').insertOne(submissionData);
      savedSubmission = await db().collection('submissions').findOne({ _id: result.insertedId });
      res.status(201).json({ message: 'Submission created', submission: savedSubmission });
    }

  } catch (error) {
    console.error('Error submitting assignment:', error);
    // Clean up uploaded files from multer if error occurs before Cloudinary upload
    if (req.files) {
        const fs = require('fs');
        req.files.forEach(file => fs.unlink(file.path, err => {
            if (err) console.error("Error deleting multer temp file:", err);
        }));
    }
    res.status(500).json({ message: 'Server error during submission' });
  }
});

// Get submissions for an assignment (aslab only)
router.get('/:id/submissions', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }
    const assignmentId = new ObjectId(req.params.id);

    const submissions = await db().collection('submissions').aggregate([
      { $match: { assignment_id: assignmentId } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      { // Attempt to join grades
        $lookup: {
          from: 'grades', // Assuming a 'grades' collection
          localField: '_id', // submission_id in grades collection should reference submission._id
          foreignField: 'submission_id',
          as: 'gradeInfo'
        }
      },
      { $unwind: { path: '$gradeInfo', preserveNullAndEmptyArrays: true } }, // Keep submission even if no grade
      {
        $lookup: { // For graded_by username
            from: 'users',
            localField: 'gradeInfo.graded_by',
            foreignField: '_id',
            as: 'graderInfo'
        }
      },
      { $unwind: { path: '$graderInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          assignment_id: 1,
          user_id: 1,
          content: 1,
          fileUrls: 1,
          submittedAt: 1,
          updatedAt: 1,
          username: '$userInfo.username',
          grade: '$gradeInfo.grade',
          feedback: '$gradeInfo.feedback',
          gradedAt: '$gradeInfo.gradedAt',
          graded_by_username: '$graderInfo.username'
        }
      },
      { $sort: { submittedAt: -1 } }
    ]).toArray();

    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grade a submission (aslab only) - Assuming a 'grades' collection
router.post('/:assignmentId/submissions/:submissionId/grade', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.assignmentId) || !ObjectId.isValid(req.params.submissionId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    const assignmentId = new ObjectId(req.params.assignmentId); // Not directly used for query but good for context
    const submissionId = new ObjectId(req.params.submissionId);
    const graderId = new ObjectId(req.user.id);

    const { grade, feedback } = req.body;
    const numericGrade = parseFloat(grade);
    if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      return res.status(400).json({ message: 'Grade must be a number between 0 and 100' });
    }

    const submission = await db().collection('submissions').findOne({ _id: submissionId, assignment_id: assignmentId });
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found for this assignment' });
    }

    const gradeData = {
      submission_id: submissionId,
      assignment_id: assignmentId, // Store for context if needed
      grade: numericGrade,
      feedback: feedback || '',
      graded_by: graderId,
      gradedAt: new Date()
    };

    // Upsert logic for grades
    const result = await db().collection('grades').updateOne(
      { submission_id: submissionId },
      { $set: gradeData },
      { upsert: true }
    );
    
    const finalGradeData = await db().collection('grades').aggregate([
        { $match: { submission_id: submissionId } },
        {
            $lookup: {
                from: 'users',
                localField: 'graded_by',
                foreignField: '_id',
                as: 'graderInfo'
            }
        },
        { $unwind: '$graderInfo'},
        {
            $project: {
                _id: 1, submission_id: 1, grade: 1, feedback: 1, gradedAt: 1,
                graded_by: '$graderInfo.username' // Return username instead of ID
            }
        }
    ]).next();


    res.json({ message: 'Grade saved successfully', grade: finalGradeData });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's submission for an assignment (including grade and feedback)
router.get('/:id/my-submission', authenticate, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid assignment ID format' });
    }
    const assignmentId = new ObjectId(req.params.id);
    const userId = new ObjectId(req.user.id);

    const submission = await db().collection('submissions').aggregate([
      { $match: { assignment_id: assignmentId, user_id: userId } },
      {
        $lookup: {
          from: 'grades',
          localField: '_id', // submission._id
          foreignField: 'submission_id',
          as: 'gradeInfo'
        }
      },
      { $unwind: { path: '$gradeInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
            from: 'users',
            localField: 'gradeInfo.graded_by',
            foreignField: '_id',
            as: 'graderInfo'
        }
      },
      { $unwind: { path: '$graderInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1, content: 1, fileUrls: 1, submittedAt: 1, updatedAt: 1,
          grade: '$gradeInfo.grade',
          feedback: '$gradeInfo.feedback',
          gradedAt: '$gradeInfo.gradedAt',
          graded_by_username: '$graderInfo.username'
        }
      }
    ]).next();

    if (!submission) {
      return res.status(404).json({ message: 'No submission found' });
    }
    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all assignments (for assignment listing page - simplified)
// This route might need more complex logic based on user role similar to /upcoming
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.id);
    let pipeline = [];

    if (req.user.role === 'aslab') {
      pipeline.push(
        { $match: {} } // Matches all assignments for aslab
      );
    } else { // Praktikan
      const enrollments = await db().collection('class_enrollments').find({ user_id: userId }).toArray();
      const enrolledClassIds = enrollments.map(e => e.class_id);
      pipeline.push(
        { $match: { class_id: { $in: enrolledClassIds } } }
        // Optionally, add logic to exclude submitted assignments like in /upcoming if needed
      );
    }

    pipeline.push(
      {
        $lookup: {
          from: 'classes',
          localField: 'class_id',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      { $unwind: '$classInfo' },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'creatorInfo'
        }
      },
      { $unwind: '$creatorInfo' },
      {
        $project: {
          _id: 1, title: 1, description: 1, deadline: 1, createdAt: 1,
          class_title: '$classInfo.title',
          creator_name: '$creatorInfo.username'
        }
      },
      { $sort: { deadline: 1 } }
    );

    const assignments = await db().collection('assignments').aggregate(pipeline).toArray();
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching all assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
