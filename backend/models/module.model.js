const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Sub-schema for files within a module
const moduleFileSchema = new Schema({
  file_name: { type: String, required: true },
  file_url: { type: String, required: true }, // URL from Cloudinary or other storage
  public_id: { type: String, required: true }, // Added public_id for Cloudinary
  file_type: { type: String }, // e.g., 'application/pdf', 'image/jpeg'
  file_size: { type: Number } // Size in bytes
  // _id will be automatically generated for each file object in the array
});

const moduleSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String, // Markdown content
    required: true
  },
  class_id: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  folder_id: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null // A module might not be in a folder (root level of a class)
  },
  order_index: {
    type: Number, // For ordering modules within a class/folder
    default: 0
  },
  files: [moduleFileSchema], // Array of files associated with the module
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // createdBy: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'User',
  //   // required: true
  // },
}, {
  timestamps: true
});

const Module = mongoose.model('Module', moduleSchema);

module.exports = Module;
