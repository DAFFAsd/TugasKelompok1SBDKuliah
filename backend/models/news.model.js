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
    // Define the linked_entity as an object with its own validation
    type: {
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
    },
    validate: { // This is the custom validator for the linked_entity object
      validator: function(value) {
        // 'value' here is the entire 'linked_entity' object ({ entity_type, entity_id })
        if ((value.entity_id && !value.entity_type) || (!value.entity_id && value.entity_type)) {
          return false;
        }
        return true;
      },
      message: 'If linking an entity, both entity_type and entity_id must be provided, or neither.'
    },
    default: () => ({ entity_type: null, entity_id: null }) // Ensure default is an object
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

const News = mongoose.model('News', newsSchema);

module.exports = News;