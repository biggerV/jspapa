var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var messageSchema = new mongoose.Schema({
  'sender': {
    '_id': ObjectId,
    'name': String
  },

  'addressee': {
    '_id': ObjectId,
    'name': String
  },

  'content': {
    'type': Mixed
  },

  'type': {
    'type': String,
    'enum': ['comment', 'reply', 'private', 'sys','point']
  },

  'created': {
    'type': Date
  },

  'read': {
    'type': Boolean,
    'default': false
  }

}, {
  'collection': 'message'
});

messageSchema.pre('save', function(next){
  this.created = new Date();
  next();
});


module.exports = db.model('Message', messageSchema);