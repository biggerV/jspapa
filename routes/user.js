var config = require('../config');
var express = require('express');
var mongodb = require('mongodb');
var multer  = require('multer');
var crypto = require('crypto');

var router = express.Router();

var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

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

//是否登陆
router.use(function(req, res, next){
  if(!req.session.user){
    res.redirect("/login");
    return false;
  }
  next();
});

//用户个人中心首页
router.get('/:name', function(req, res, next) {
  var uname = req.params.name;

  MongoClient.connect(config.mongodbUrl, function(err, db) {
    var user = db.collection('user');
    var topic = db.collection('topic');

    user.findOne({"name": uname}, function(err, userResult){
      if(err){
        console.log(err);
      }else{

        var topicIds = [];
        var replyIds = [];

        for(var i=0; i<userResult.topics.length; i++){
          topicIds.push(ObjectId(userResult.topics[i]));
        }

        for(var i=0; i<userResult.replies.length; i++){
          replyIds.push(ObjectId(userResult.replies[i]));
        }

        topic.find({"_id": {"$in": topicIds}}).sort({"created": -1}).toArray(function(err, topicsResult){
          if(err){
            console.log(err);
          }else{
            topic.find({"_id": {"$in": replyIds}}).toArray(function(err, repliesResult){
              if(err){
                console.log(err);
              }else{
                //重新按评论顺序排序
                var newRepliesResult = [];
                var rlen = repliesResult.length;
                for(var i=0; i<rlen; i++){
                  for(var j=0; j<rlen; j++){
                    if(repliesResult[j]["_id"].toString() === replyIds[i].toString()){
                      newRepliesResult.push(repliesResult[j]);
                    }
                  }
                }
                
                res.render('user', {"iuser": userResult, "topics": topicsResult, "replies": newRepliesResult.reverse()});
                db.close();
              }
            });
          }
        });

      }
    });

  });
});

//用户主题列表
router.get('/:name/topics', function(req, res, next) {
  var uname = req.params.name;
  var cur = req.query.page ? Number(req.query.page) : 1;
  var limit = 10;
  var skip = (cur - 1) * limit;
  var total = 0;

  MongoClient.connect(config.mongodbUrl, function(err, db) {
    var topic = db.collection('topic');
    var user = db.collection('user');

    user.findOne({"name": uname}, function(err, userResult){
      if(err){
        console.log(err);
      }else{

        topic.count({"user._id": userResult._id}, function(err, count){
          total = Math.ceil(count/limit);
          topic.find({"user._id": userResult._id}).sort({"created": -1}).skip(skip).limit(limit).toArray(function(err, result){
            res.render('user-topics', {"topics": result, "page": {"total": total, "count": count, "cur": cur}, "iuser": userResult});
            db.close();
          });
        });

      }
    });

  });
  
});


//信息设置页面
router.get('/:name/setting', function(req, res, next) {
  var msg = req.query.stat==="true" ? "保存成功" : "";

  MongoClient.connect(config.mongodbUrl, function(err, db) {
    var user = db.collection('user');
    user.findOne({"_id": ObjectId(req.session.user._id)}, function(err, result){
      if(err){
        console.log(err);
      }else{
        req.session.user = result;
        res.render("user-setting", {"me": result, "msg": msg});
        db.close();
      }
    });
  });
  
});

//信息设置保存
router.post('/:name/setting', upload.single('avatar'), function(req, res, next) {
  MongoClient.connect(config.mongodbUrl, function(err, db) {
    var user = db.collection('user');

    if(!req.body.pwd){
      delete req.body.pwd;
    }else{
      req.body.pwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');
    }

    if(req.file){
      req.body.avatar = req.file.filename;
    }

    user.updateOne({"_id": ObjectId(req.session.user._id)}, {"$set": req.body}, function(err, result){
      if(err){
        console.log(err);
      }else{
        res.redirect("/user/"+req.session.user.name+"/setting?stat=true");
        db.close();
      }
    });

  });
  
});

//退出登录
router.get('/:name/logout', function(req, res, next) {
  req.session.destroy(function(err){
    if(err){
      console.log(err);
    }else{
      res.redirect("/login");
    }
  });
  
});


module.exports = router;
