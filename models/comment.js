var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var commentSchema = new mongoose.Schema({
  'content': {
    'type': String
  },

  'user': {
    '_id': ObjectId,
    'name': String
  },

  'topicId': {
    'type': ObjectId,
    'trim': true
  },

  'created': {
    'type': Date,
    'default': new Date()
  },
  'updated': {
    'type': Date
  }
}, {
  'collection': 'comment'
});

commentSchema.pre('save', function(next){
  this.updated = new Date();
  next();
});


module.exports = db.model('Comment', commentSchema);
