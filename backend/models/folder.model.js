const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const folderSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  class_id: {
    type: Schema.Types.ObjectId,
    ref: 'Class', // Reference to the Class model
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order_index: {
    type: Number,
    default: 0
  },
  // createdBy: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'User',
  //   // required: true
  // },
  // Add other fields as necessary
}, {
  timestamps: true
});

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
