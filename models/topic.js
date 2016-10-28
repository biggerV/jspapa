var config = require('../config');
var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var getCates = function(){
  var cates = [];
  for(cate in config.cates){
    cates.push(cate);
  }
  cates.shift(0);
  return cates;
}

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
    'enum': getCates(),
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
    'enum': ['good', 'top'],
    'trim': true
  },
  'created': {
    'type': Date
  },
  'updated': {
    'type': Date
  },
  'replied': {
    'type': Date
  },
  'sorted': {
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
  },

  updateRepliedById: function(id){
    this.update({"_id": id}, {'$set': {'replied': new Date()}}, function(err){
      if(err){
        console.log(err);
      }
    });
  },

  updateSortedById: function(id, type){
    var time;
    if(type === "top"){
      time = new Date(2020, 01, 01);
    }else{
      time = new Date();
    }
    this.update({"_id": id}, {'$set': {'sorted': time}}, function(err){
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
