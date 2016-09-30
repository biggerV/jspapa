var mongoose = require('mongoose');

var siteSchema = new mongoose.Schema({
  "users" : Number,
  "topics" : Number,
  "comments" : Number,
  "name" : {
    'type': String,
    'default': 'counter'
  }
}, {
  'collection': 'site'
});

siteSchema.static({
  updateUsers: function(id){
    this.update({"name": 'counter'}, {'$inc': {'users': 1}}, function(err){
      if(err){
        console.log(err);
      }
    });
  },

  updateTopics: function(id){
    this.update({"name": 'counter'}, {'$inc': {'topics': 1}}, function(err){
      if(err){
        console.log(err);
      }
    });
  },

  updateCommets: function(id){
    this.update({"name": 'counter'}, {'$inc': {'comments': 1}}, function(err){
      if(err){
        console.log(err);
      }
    });
  }
});

module.exports = db.model('Site', siteSchema);
