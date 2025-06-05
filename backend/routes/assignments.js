const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadFile } = require('../config/cloudinary');
const { Assignment, Submission, Grade } = require('../models/assignment.model');
const User = require('../models/user.model'); // Assuming User model exists
const { Class, ClassEnrollment} = require('../models/class.model'); // Assuming Class model exists

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Maximum number of files allowed per upload
const MAX_FILES = 5;

// Get all assignments for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const assignments = await Assignment.find({ class_id: req.params.classId })
      .populate('created_by', 'username')
      .sort({ deadline: 1 });

    // Transform data to match original structure
    const transformedAssignments = assignments.map(assignment => ({
      ...assignment.toObject(),
      creator_name: assignment.created_by.username
    }));

    res.json(transformedAssignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming assignments for the current user
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    console.log(`Fetching upcoming assignments for user ${req.user.id} with role ${req.user.role}`);

    // First check if the user is enrolled in any classes
    const enrollmentCount = await ClassEnrollment.countDocuments({ user_id: req.user.id });
    console.log(`User has ${enrollmentCount} class enrollments`);

    if (enrollmentCount === 0) {
      console.log('User is not enrolled in any classes, returning empty array');
      return res.json([]);
    }

    // Get user's enrolled classes
    const enrollments = await ClassEnrollment.find({ user_id: req.user.id }).select('class_id');
    const classIds = enrollments.map(enrollment => enrollment.class_id);

    let assignmentQuery = {
      class_id: { $in: classIds },
      deadline: { $gt: new Date() }
    };

    // For praktikan, exclude assignments that have already been submitted
    if (req.user.role === 'praktikan') {
      const submittedAssignments = await Submission.find({ user_id: req.user.id }).select('assignment_id');
      const submittedAssignmentIds = submittedAssignments.map(sub => sub.assignment_id);
      
      assignmentQuery._id = { $nin: submittedAssignmentIds };
    }

    const assignments = await Assignment.find(assignmentQuery)
      .populate('class_id', 'title')
      .sort({ deadline: 1 })
      .limit(limit);

    // Transform data to match original structure
    const transformedAssignments = assignments.map(assignment => ({
      ...assignment.toObject(),
      class_title: assignment.class_id.title
    }));

    console.log(`Found ${transformedAssignments.length} upcoming assignments`);
    res.json(transformedAssignments);
  } catch (error) {
    console.error('Error fetching upcoming assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get an assignment by ID
router.get('/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('created_by', 'username')
      .populate('class_id', 'title');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Transform data to match original structure
    const transformedAssignment = {
      ...assignment.toObject(),
      creator_name: assignment.created_by.username,
      class_title: assignment.class_id.title
    };

    res.json(transformedAssignment);
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

    // Check if class exists
    const classExists = await Class.findById(class_id);
    if (!classExists) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const assignment = new Assignment({
      class_id,
      title,
      description,
      deadline,
      created_by: req.user.id
    });

    const savedAssignment = await assignment.save();
    res.status(201).json(savedAssignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an assignment (aslab only)
router.put('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const { title, description, deadline } = req.body;

    if (!title || !description || !deadline) {
      return res.status(400).json({ message: 'Title, description, and deadline are required' });
    }

    // Check if assignment exists
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only allow the creator or an aslab to update
    if (assignment.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to update this assignment' });
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { title, description, deadline },
      { new: true }
    );

    res.json(updatedAssignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an assignment (aslab only)
router.delete('/:id', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    // Check if assignment exists
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Only allow the creator or an aslab to delete
    if (assignment.created_by.toString() !== req.user.id && req.user.role !== 'aslab') {
      return res.status(403).json({ message: 'Not authorized to delete this assignment' });
    }

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit an assignment (praktikan only)
router.post('/:id/submit', authenticate, authorize(['praktikan']), upload.array('files', MAX_FILES), async (req, res) => {
  try {
    const { content, existingFiles } = req.body;
    const files = req.files;

    // Check if assignment exists
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if deadline has passed
    const now = new Date();
    if (now > assignment.deadline) {
      return res.status(400).json({ message: 'Deadline has passed' });
    }

    // Process file uploads and store URLs
    let fileUrls = [];

    // Add existing files that weren't removed
    if (existingFiles) {
      try {
        const parsedExistingFiles = JSON.parse(existingFiles);
        if (Array.isArray(parsedExistingFiles)) {
          fileUrls = [...parsedExistingFiles];
        }
      } catch (e) {
        console.error('Error parsing existing files:', e);
      }
    }

    // Add new files
    if (files && files.length > 0) {
      // Check if total files would exceed the limit
      if (fileUrls.length + files.length > MAX_FILES) {
        return res.status(400).json({
          message: `Cannot add ${files.length} files. Maximum ${MAX_FILES} files allowed per submission. Current count: ${fileUrls.length}`
        });
      }

      // Upload each file to Cloudinary
      for (const file of files) {
        const uploadResult = await uploadFile(file, 'submissions');
        fileUrls.push(uploadResult.url);
      }
    }

    // Check if submission already exists
    const existingSubmission = await Submission.findOne({
      assignment_id: req.params.id,
      user_id: req.user.id
    });

    if (existingSubmission) {
      // Update existing submission
      existingSubmission.content = content;
      existingSubmission.file_urls = fileUrls;
      const updatedSubmission = await existingSubmission.save();
      
      return res.json({ message: 'Submission updated', submission: updatedSubmission });
    } else {
      // Create new submission
      const submission = new Submission({
        assignment_id: req.params.id,
        user_id: req.user.id,
        content,
        file_urls: fileUrls
      });

      const savedSubmission = await submission.save();
      return res.status(201).json({ message: 'Submission created', submission: savedSubmission });
    }
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get submissions for an assignment (aslab only)
router.get('/:id/submissions', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const submissions = await Submission.find({ assignment_id: req.params.id })
      .populate('user_id', 'username')
      .sort({ submitted_at: -1 });

    // Get grades for all submissions
    const submissionIds = submissions.map(sub => sub._id);
    const grades = await Grade.find({ submission_id: { $in: submissionIds } })
      .populate('graded_by', 'username');

    // Create a map of grades by submission_id
    const gradeMap = {};
    grades.forEach(grade => {
      gradeMap[grade.submission_id.toString()] = {
        grade: grade.grade,
        feedback: grade.feedback,
        graded_at: grade.graded_at,
        graded_by: grade.graded_by.username
      };
    });

    // Transform data to match original structure
    const transformedSubmissions = submissions.map(submission => {
      const gradeInfo = gradeMap[submission._id.toString()];
      return {
        ...submission.toObject(),
        username: submission.user_id.username,
        grade: gradeInfo?.grade || null,
        feedback: gradeInfo?.feedback || null,
        graded_at: gradeInfo?.graded_at || null,
        graded_by: gradeInfo?.graded_by || null,
        file_url: JSON.stringify(submission.file_urls) // Convert array to JSON string for compatibility
      };
    });

    res.json(transformedSubmissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grade a submission (aslab only)
router.post('/:id/submissions/:submissionId/grade', authenticate, authorize(['aslab']), async (req, res) => {
  try {
    const { grade, feedback } = req.body;
    const { submissionId } = req.params;

    // Validate grade
    const numericGrade = parseFloat(grade);
    if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      return res.status(400).json({ message: 'Grade must be a number between 0 and 100' });
    }

    // Check if submission exists
    const submission = await Submission.findOne({
      _id: submissionId,
      assignment_id: req.params.id
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if grade already exists
    const existingGrade = await Grade.findOne({ submission_id: submissionId });

    let savedGrade;

    if (existingGrade) {
      // Update existing grade
      existingGrade.grade = numericGrade;
      existingGrade.feedback = feedback;
      existingGrade.graded_by = req.user.id;
      savedGrade = await existingGrade.save();
    } else {
      // Create new grade
      const newGrade = new Grade({
        submission_id: submissionId,
        grade: numericGrade,
        feedback,
        graded_by: req.user.id
      });
      savedGrade = await newGrade.save();
    }

    // Get username of grader
    const grader = await User.findById(req.user.id).select('username');

    const gradeData = {
      ...savedGrade.toObject(),
      graded_by: grader.username
    };

    res.json({ message: 'Grade saved successfully', grade: gradeData });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's submission for an assignment (including grade and feedback)
router.get('/:id/my-submission', authenticate, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      assignment_id: req.params.id,
      user_id: req.user.id
    });

    if (!submission) {
      return res.status(404).json({ message: 'No submission found' });
    }

    // Get grade information
    const grade = await Grade.findOne({ submission_id: submission._id })
      .populate('graded_by', 'username');

    // Transform data to match original structure
    const transformedSubmission = {
      ...submission.toObject(),
      grade: grade?.grade || null,
      feedback: grade?.feedback || null,
      graded_at: grade?.graded_at || null,
      graded_by: grade?.graded_by?.username || null,
      file_url: JSON.stringify(submission.file_urls) // Convert array to JSON string for compatibility
    };

    res.json(transformedSubmission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all assignments (for assignment listing page)
router.get('/', authenticate, async (req, res) => {
  try {
    let assignments;

    if (req.user.role === 'aslab') {
      // For aslab, get all assignments
      assignments = await Assignment.find()
        .populate('class_id', 'title')
        .populate('created_by', 'username')
        .sort({ deadline: 1 });
    } else {
      // For praktikan, get assignments from enrolled classes
      const enrollments = await ClassEnrollment.find({ user_id: req.user.id }).select('class_id');
      const classIds = enrollments.map(enrollment => enrollment.class_id);

      let assignmentQuery = { class_id: { $in: classIds } };

      // Exclude assignments that have already been submitted by the user
      if (req.user.role === 'praktikan') {
        const submittedAssignments = await Submission.find({ user_id: req.user.id }).select('assignment_id');
        const submittedAssignmentIds = submittedAssignments.map(sub => sub.assignment_id);
        assignmentQuery._id = { $nin: submittedAssignmentIds };
      }

      assignments = await Assignment.find(assignmentQuery)
        .populate('class_id', 'title')
        .populate('created_by', 'username')
        .sort({ deadline: 1 });
    }

    // Transform data to match original structure
    const transformedAssignments = assignments.map(assignment => ({
      ...assignment.toObject(),
      class_title: assignment.class_id.title,
      creator_name: assignment.created_by.username
    }));

    res.json(transformedAssignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;