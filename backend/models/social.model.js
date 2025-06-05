const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Comment Schema
const CommentSchema = new Schema({
    post_id: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: [true, 'Comment content is required'],
        trim: true
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Post Schema
const PostSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: [true, 'Post content is required'],
        trim: true
    },
    image_url: {
        type: String,
        default: null
    },
    image_public_id: {
        type: String,
        default: null
    },
    linked_entity: {
        entity_type: {
            type: String,
            enum: {
                values: ['class', 'module', 'assignment', null],
                message: 'Invalid entity type: {VALUE}'
            },
            default: null
        },
        entity_id: {
            type: Schema.Types.ObjectId,
            refPath: 'linked_entity.entity_model_name',
            default: null,
            validate: {
                validator: function(v) {
                    // `this` refers to the linked_entity object itself within the subdocument validator
                    return !(this.entity_type && !v);
                },
                message: 'Entity ID is required if entity type is specified.'
            }
        },
        entity_model_name: { // Stores 'Class', 'Module', 'Assignment'
            type: String,
            enum: {
                values: ['Class', 'Module', 'Assignment', null],
                message: 'Invalid entity model name: {VALUE}'
            },
            default: null
        }
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true }, // Ensure virtuals are included when converting to JSON
    toObject: { virtuals: true } // Ensure virtuals are included when converting to Object
});

// Virtual for comment count
PostSchema.virtual('comment_count', {
    ref: 'Comment', // The model to use
    localField: '_id', // Find comments where `localField`
    foreignField: 'post_id', // is equal to `foreignField`
    count: true // And only get the number of docs
});

// Middleware to set entity_model_name based on entity_type before saving a new document
PostSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('linked_entity.entity_type')) {
        if (this.linked_entity && this.linked_entity.entity_type) {
            switch (this.linked_entity.entity_type) {
                case 'class':
                    this.linked_entity.entity_model_name = 'Class';
                    break;
                case 'module':
                    this.linked_entity.entity_model_name = 'Module';
                    break;
                case 'assignment':
                    this.linked_entity.entity_model_name = 'Assignment';
                    break;
                default:
                    this.linked_entity.entity_model_name = null;
                    // If type is unrecognized or explicitly set to null, ensure ID is also null
                    if (this.linked_entity.entity_type !== null) this.linked_entity.entity_id = null;
            }
            // If entity_type is set but entity_id is not, this will be caught by the validator if entity_id is required.
            // If entity_type is null, ensure model_name and id are null
            if (this.linked_entity.entity_type === null) {
                this.linked_entity.entity_model_name = null;
                this.linked_entity.entity_id = null;
            }
        } else if (this.linked_entity) {
            // If entity_type is explicitly set to undefined or removed, but linked_entity object exists
            this.linked_entity.entity_model_name = null;
            this.linked_entity.entity_id = null;
        }
    }
    next();
});

// Middleware to set entity_model_name for update operations (e.g., findOneAndUpdate)
PostSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function(next) {
    const update = this.getUpdate();
    let entityType, entityId;

    // Determine the entity_type and entity_id from the update operation
    if (update.$set && update.$set['linked_entity.entity_type'] !== undefined) {
        entityType = update.$set['linked_entity.entity_type'];
        entityId = update.$set['linked_entity.entity_id']; // Potentially undefined
    } else if (update.linked_entity && update.linked_entity.entity_type !== undefined) {
        entityType = update.linked_entity.entity_type;
        entityId = update.linked_entity.entity_id; // Potentially undefined
    }

    if (entityType !== undefined) { // If entity_type is part of the update
        let modelName = null;
        switch (entityType) {
            case 'class': modelName = 'Class'; break;
            case 'module': modelName = 'Module'; break;
            case 'assignment': modelName = 'Assignment'; break;
        }
        
        // Set or unset entity_model_name
        if (modelName) {
            this.set({ 'linked_entity.entity_model_name': modelName });
        } else {
            this.set({ 'linked_entity.entity_model_name': null });
        }

        // If entityType is null or invalid, ensure entity_id is also set to null in the update
        if (entityType === null || !modelName) {
            if (update.$set) {
                update.$set['linked_entity.entity_id'] = null;
                // If entity_type itself is null, ensure model_name is also explicitly nulled in $set
                if (entityType === null) update.$set['linked_entity.entity_model_name'] = null;
            } else if (update.linked_entity) { // Should not happen if using this.set
                update.linked_entity.entity_id = null;
                if (entityType === null) update.linked_entity.entity_model_name = null;
            }
        }
    } else if (update.$set && update.$set.linked_entity === null) {
        // Handle case where the entire linked_entity is set to null
        this.set({
            'linked_entity.entity_type': null,
            'linked_entity.entity_id': null,
            'linked_entity.entity_model_name': null
        });
    } else if (update.$unset && update.$unset.linked_entity) {
        // If unsetting the whole linked_entity, model_name and id are implicitly removed.
        // No specific action needed here for $unset, but good to be aware.
    }

    next();
});


const Post = mongoose.model('Post', PostSchema);
const Comment = mongoose.model('Comment', CommentSchema);

// It's good practice to ensure related models (User, Class, Module, Assignment)
// are registered with Mongoose before this model is used, typically by requiring them
// in your main application file or a dedicated model index file.

module.exports = {
    Post,
    Comment
};