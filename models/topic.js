var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var topicSchema = new mongoose.Schema({
  'title': {
    'type': String,
    'trim': true
  },

  'content': {
    'type': String,
  },

  'user': {
    '_id': ObjectId,
    'name': String
  },

  'cate': {
    'type': String,
    'trim': true
  },
  
  'views': {
    'type': Number,
    'default': 0
  },
  'comments': {
    'type': Number,
    'default': 0
  },
  'type': {
    'type': String,
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
  'collection': 'topic'
});

topicSchema.static({
  updateVeiwsById: function(id){
    this.update({"_id": id}, {'$inc': {'views': 1}}, function(err){
      if(err){
        console.log(err);
      }
    });
  },

  updateCommentsById: function(id){
    this.update({"_id": id}, {'$inc': {'comments': 1}}, function(err){
      if(err){
        console.log(err);
      }
    });
  }
});

topicSchema.pre('save', function(next){
  this.updated = new Date();
  next();
});

module.exports = db.model('Topic', topicSchema);
