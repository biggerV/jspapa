var config = require('../config');
var multer  = require('multer');
var crypto = require('crypto');
var M = require('../models');

var upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'static/uploads/avatar')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + req.session.user.name)
    }
  }),

  fileFilter: function (req, file, cb) {
    var imgTypes = ["image/png", "image/jpeg", "image/gif", "image/bmp"];
    if(imgTypes.indexOf(file.mimetype) > -1){
      cb(null, true);
    }else{
      cb(null, false);
    }
  }
});

module.exports = {
  isLogin: function(req, res, next){
    if(!req.session.user){
      res.redirect("/login");
      return false;
    }
    next();
  },

  home: function(req, res, next){
    var uname = req.params.name;
    var data = {};

    M.User.findOne({"name": uname}).exec()
    .then(function(userDoc){
      data.iuser = userDoc;
    })
    .then(function(){
      return M.Topic.find({"_id": {"$in": data.iuser.topics}}).sort({"created": -1}).exec();
    })
    .then(function(topicsDoc){
      data.topics = topicsDoc;
    })
    .then(function(){
      return M.Topic.find({"_id": {"$in": data.iuser.replies}}).exec();
    })
    .then(function(repliesDoc){
      //重新按评论顺序排序
      var newrepliesDoc = [];
      var rlen = repliesDoc.length;
      for(var i=0; i<rlen; i++){
        for(var j=0; j<rlen; j++){
          if(repliesDoc[j]["_id"].toString() === data.iuser.replies[i].toString()){
            newrepliesDoc.push(repliesDoc[j]);
          }
        }
      }
      data.replies = newrepliesDoc.reverse();
    })
    .then(function(){
      res.render('user', data);
    })
    .catch(function(err){
      console.log(err);
    });
  },

  topics: function(req, res, next){
    var uname = req.params.name;
    var cur = req.query.page ? Number(req.query.page) : 1;
    var limit = 10;
    var skip = (cur - 1) * limit;
    var data = {};


    M.User.findOne({"name": uname}).exec()
    .then(function(userDoc){
      data.iuser = userDoc
      return M.Topic.count({"user._id": userDoc._id}).exec();
    })
    .then(function(count){
      data.page = {"total": Math.ceil(count/limit), "count": count, "cur": cur};
    })
    .then(function(){
      return M.Topic.find({"user._id": data.iuser._id}).sort({"created": -1}).skip(skip).limit(limit).exec();
    })
    .then(function(userTopics){
      data.topics = userTopics;
      res.render('user-topics', data);
    })
    .catch(function(err){
      console.log(err);
    });
  },

  setting: function(req, res, next){
    var msg = req.query.stat==="true" ? "保存成功" : "";

    M.User.findOne({"_id": req.session.user._id}).exec()
    .then(function(doc){
      req.session.user = doc;
      res.render("user-setting", {"me": doc, "msg": msg});
    })
    .catch(function(err){
      console.log(err);
    });
  },

  uploadAvatar: upload.single('avatar'),

  updateSetting: function(req, res, next){
    M.User.findOne({"_id": req.session.user._id}).exec()
    .then(function(userDoc){
      if(req.body.pwd){
        userDoc.pwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');
      }
      if(req.file){
        userDoc.avatar = req.file.filename;
      }
      userDoc.site = req.body.site;
      userDoc.city = req.body.city;
      userDoc.weibo = req.body.weibo;
      userDoc.wechat = req.body.wechat;
      userDoc.github = req.body.github;
      userDoc.sign = req.body.sign;

      userDoc.save(function(err){
        if(err){
          console.log(err)
          res.render('error', {"msg": "保存失败，请检查！"});
        }else{
          res.redirect("/user/"+req.session.user.name+"/setting?stat=true");
        }
      });

    })
    .catch(function(err){
      console.log(err);
    });
  },

  logout: function(req, res, next){
    req.session.destroy(function(err){
      if(err){
        console.log(err);
      }else{
        res.redirect("/login");
      }
    });
  }

}