var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var wxStatSchema = new mongoose.Schema({
  'openId': {
    'type': String
  },

  'user': {
    '_id': ObjectId,
    'name': String
  },

  'created': {
    'type': Date
  }

}, {
  'collection': 'wxstat'
});

module.exports = db.model('Wxstat', wxStatSchema);
