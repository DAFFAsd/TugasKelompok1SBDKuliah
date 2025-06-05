const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newsSchema = new Schema({
  title: {
    type: String,
    required: [true, 'News title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'News content is required']
  },
  news_image_url: {
    type: String,
    default: null
  },
  news_image_public_id: {
    type: String,
    default: null
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Assuming your User model is named 'User'
    required: true
  },
  linked_entity: {
    entity_type: {
      type: String,
      enum: ['Class', 'Module', 'Assignment', null], // Model names must match exactly
      default: null
    },
    entity_id: {
      type: Schema.Types.ObjectId,
      refPath: 'linked_entity.entity_type', // Dynamically references based on entity_type
      default: null
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Ensure that if entity_id is present, entity_type must also be present
newsSchema.path('linked_entity').validate(function (value) {
  if (value.entity_id && !value.entity_type) {
    return false;
  }
  if (!value.entity_id && value.entity_type) {
    return false;
  }
  return true;
}, 'If linking an entity, both entity_type and entity_id must be provided, or neither.');

const News = mongoose.model('News', newsSchema);

module.exports = News;
