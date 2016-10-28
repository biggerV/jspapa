var config = require('../config');
var multer  = require('multer');
var crypto = require('crypto');
var markdown = require('markdown').markdown;
var M = require('../models');

var upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, config.uploadPath+"/avatar")
    },
    filename: function (req, file, cb) {
      cb(null, "avatar-" + req.session.user.name)
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
      if(userDoc){
        data.iuser = userDoc;
      }else{
        res.render("error", {msg: "没有此用户！"});
        throw new Error();
      }
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

  uploadPicSet: upload.single('file'),//上传控件默认的命名就是file，不需要修改这里

  uploadPic: function(req, res, next){
    if(req.file){
      res.json({"pic": req.file.filename});
    }else{
      res.json({"success": false});
    }
  },

  updateSetting: function(req, res, next){

    M.User.findOne({"_id": req.session.user._id}).exec()
    .then(function(userDoc){
      if(req.body.pwd){
        userDoc.pwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');
      }
      userDoc.avatar = req.body.avatar;
      userDoc.site = req.body.site;
      userDoc.city = req.body.city;
      userDoc.weibo = req.body.weibo;
      userDoc.wechat = req.body.wechat;
      userDoc.github = req.body.github;
      userDoc.sign = req.body.sign;

      userDoc.save(function(err, doc){
        if(err){
          console.log(err)
          res.render('error', {"msg": "保存失败，请检查！"});
        }else{

          //之前没有完善信息
          var flag1 = false;
          for(var item in req.session.user){
            if(req.session.user[item] === ""){
              flag1 = true;
            }
          }

          //如果全都填写了送积分
          var flag2 = true;
          for(var item in userDoc){
            if(userDoc[item] === ""){
              flag2 = false;
            }
          }

          var setPoint = function(rule, reason){
            //当前用户积分变动
            M.User.updatePointById(req.session.user._id, rule);

            //当前用户消息+1
            M.User.updateMessageById(req.session.user._id);

            //给当前用户发送积分变动消息
            M.Message.create({
              sender: {
                "name": "admin"
              },
              addressee: {
                "_id": req.session.user._id,
                "name": req.session.user.name
              },
              content: {
                "point": config.pointRules[rule],
                "reason": reason
              },
              type: "point"
            });
          }

          if(flag1 && flag2){
            setPoint("perfectInfo", "完善个人信息");
          }else if(!flag1 && !flag2){
            setPoint("noPerfectInfo", "个人信息不完善");
          }

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
  },

  message: function(req, res, next){
    var cur = req.query.page ? Number(req.query.page) : 1;
    var limit = 15;
    var skip = (cur - 1) * limit;
    var query = {"addressee._id": req.session.user._id};
    var data = {};

    M.Message.find(query, null, {'skip': skip, 'limit': limit, 'sort': {"created": -1}}).exec()
    .then(function(docs){
      data.messages = docs;
    })
    .then(function(){
      return M.Message.count(query).exec();
    })
    .then(function(count){
      data.page = {'total': Math.ceil(count/limit), 'count': count, 'cur': cur};

      res.render("user-message", data);
    })
    .catch(function(err){
      console.log(err);
    });
  },

  showMessage: function(req, res, next){
    var mid = req.params.id;
    var tid = req.query.tid;
    var cid = req.query.cid;

    var inboxType = ["sys", "private", "point"];

    M.Message.findOne({"_id": mid}).exec()
    .then(function(doc){

      if(doc.addressee._id.toString() !== req.session.user._id){
        res.redirect("/login");
        return false;
      }

      var showMsg = function(){
        if(inboxType.indexOf(doc.type) > -1){
          if(typeof doc.content === "string"){
            doc.content = markdown.toHTML(doc.content);
          }
          res.render("user-message-show", {message: doc});
        }else{
          res.redirect("/topic/show/"+tid+"#"+cid);
        }
      }

      if(doc.read){
        showMsg();
      }else{
        M.Message.update({"_id": mid}, {$set: {"read": true}}).exec()
        .then(function(){
          return M.User.update({"_id": req.session.user._id}, {$inc: {"message": -1}}).exec();
        })
        .then(function(){
          --req.session.user.message;
        })
        .then(function(){
          showMsg();
        })
        .catch(function(err){
          console.log(err);
        });
      }
    });

  },

  privateMessage: function(req, res, next){
    res.render("user-message-private", {addresseeName: req.params.name});
  },

  privateMsg: function(req, res, next){
    var addressee = req.params.name;
    var sender = req.session.user;

    if(req.session.user.point <= 0){
      res.render("error", {msg: "您的积分不足，无法发送私信！"});
      return false;
    }

    if(!req.body.content){
      res.render("user-message-private", {msg: "请输入私信内容后发送！"});
      return false;
    }

    M.User.findOne({"name": addressee}).exec()
    .then(function(doc){
      if(!doc){
        res.render("error", {msg: "没有此用户！"});
        throw new Error;
      }else{
        return doc;
      }
    })
    .then(function(doc){
      //收信人未读消息+1
      M.User.updateMessageById(doc._id);

      //给收信人发送消息
      M.Message.create({
        sender: {
          _id: sender._id,
          name: sender.name
        },
        addressee: {
          _id: doc._id,
          name: doc.name
        },
        content: req.body.content,
        type: "private"
      });

      //发送私信者积分变动
      M.User.updatePointById(req.session.user._id, "sendPrivateMsg");

      //发送私信者消息+1
      M.User.updateMessageById(sender._id);

      //给发送私信者发送积分变动消息
      M.Message.create({
        sender: {
          "name": "admin"
        },
        addressee: {
          "_id": sender._id,
          "name": sender.name
        },
        content: {
          title: doc.name,
          point: config.pointRules.sendPrivateMsg,
          reason: "发送私信"
        },
        type: "point"
      });

    })
    .then(function(){
      //刷新用户session
      M.User.findOne({"_id": req.session.user._id}, function(err, newUserInfo){
        req.session.user = newUserInfo;

        res.render("user-message-private", {msg: "私信发送成功！", addresseeName: addressee});
      });
    })
    .catch(function(err){
      console.log(err);
    });

  }

}