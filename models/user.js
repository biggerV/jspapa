var config = require('../config');
var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var userSchema = new mongoose.Schema({
  'name': {
    'type': String,
    'validate': {
      'validator': function(v){
        if(v.length > 0 && v !== 'admin'){
          return /^[A-Za-z][A-Za-z0-9]{5,19}$/.test(v);
        }
      },
      'message': '用户名长度为6-20，必须字母打头，可以使用英文字母和数字组成'
    },
    'unique': true,
    'trim': true
  },

  'pwd': {
    'type': String,
    'validate': {
      'validator': function(v){
        if(v && v.length > 0){
          return /^[^\s]{6,32}$/.test(v);
        }
      },
      'message': '密码长度为6-32'
    },
    'trim': true
  },

  'email': {
    'type': String,
    'validate': {
      'validator': function(v){
        if(v.length > 0){
          return /^[\w\.\_\-]+@[\w\.\_\-]+(\.[\w\-]{2,3}){1,2}$/.test(v);
        }
      },
      'message': '邮箱格式不正确'
    },
    'unique': true,
    'lowercase': true,
    'trim': true
  },

  'site': {
    'type': String,
    'validate': {
      'validator': function(v){
        if(v.length > 0){
          return /^[a-zA-z]+:\/\/(\w+(-\w+)*)(\.(\w+(-\w+)*))*(\?\S*)?$/.test(v);
        }
      },
      'message': '网址格式不正确'
    },
    'trim': true
  },
  'country': {
    'type': String,
    'trim': true
  },
  'province': {
    'type': String,
    'trim': true
  },
  'city': {
    'type': String,
    'trim': true
  },
  'gender': {
    'type': Number
  },
  'nickName': {
    'type': String,
    'trim': true
  },
  'weibo': {
    'type': String,
    'trim': true
  },
  'wechat': {
    'type': String,
    'trim': true
  },
  'github': {
    'type': String,
    'trim': true
  },
  'sign': {
    'type': String,
    'trim': true
  },
  'avatar': String,

  'topics': {
    'type': [ObjectId],
    'default': []
  },
  
  'replies': {
    'type': [ObjectId],
    'default': []
  },
  
  'created': {
    'type': Date
  },
  
  'level': {
    'type': Number
  },
  
  'message': {
    'type': Number,
    'default': 0
  },
  
  'point': {
    'type': Number,
    'default': 0
  },

  'openId': {
    'type': String
  }

}, {
  'collection': 'user'
});

userSchema.static({

  updateMessageById: function(id, type){
    var doc = {'$inc': {'message': 1}};
    if(type === "minus"){
      doc = {'$inc': {'message': -1}};
    }else if(type === "clear"){
      doc = {'$set': {'message': 0}};
    }
    this.update({"_id": id}, doc, function(err){
      if(err){
        console.log(err);
      }
    });
  },

  updatePointById: function(id, type){
    this.update({"_id": id}, {'$inc': {'point': config.pointRules[type]}}, function(err){
      if(err){
        console.log(err);
      }
    });
  }

});


module.exports = db.model('User', userSchema);
