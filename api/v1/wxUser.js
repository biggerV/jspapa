var config = require('../../config');
var https = require('https');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var WXBizDataCrypt = require('./WXBizDataCrypt');

var M = require('../../models');

var appId = '';//微信小程序后台获取
var appSecret = '';//微信小程序后台获取

var getSessionKey = function(code,cb){
  https.get('https://api.weixin.qq.com/sns/jscode2session?appid='+appId+'&secret='+appSecret+'&js_code='+code+'&grant_type=authorization_code',function(res){
    res.on("data", function(data){
      cb(JSON.parse(data));
    })
  }).on("error", function(e){
    console.log(e);
  });
}

var funcs = {
  checkWxLogin: function(openId, cb){
    M.Wxstat.findOne({"openId": openId}).exec()
    .then(function(doc){
      cb && cb(doc);
    })
    .catch(function(err){
      res.json({success: false, "msg": "发生错误"});
      console.log(err);
    });
  },

  setWxLogin: function(doc, cb){
    M.Wxstat.create({
      openId: doc.openId,
      user: {
        _id: doc._id,
        name: doc.name
      },
      created: new Date()
    }, function(err){
      cb && cb(err);
    })
    .catch(function(err){
      res.json({success: false, "msg": "发生错误"});
      console.log(err);
    });
  },

  getWxUser: function(req, res, next){
    getSessionKey(req.body.code, function(data){
      try{
        var pc = new WXBizDataCrypt(appId, data.session_key);
        var datas = pc.decryptData(req.body.encryptedData , req.body.iv);
        res.json(datas);
      }catch(e){
        res.json({success: false});
      }
    })
  },

  setWxBind: function(req, res, next){
    var uPwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');
    if(!req.body.name || !req.body.pwd){
      res.json({success: false, "msg": "用户名或密码不能为空"});
      return;
    }
    M.User.findOne({"name": req.body.name, "pwd": uPwd}).exec()
    .then(function(doc){
      if(doc){
        doc.avatar = req.body.wxUser.avatarUrl;
        doc.country = req.body.wxUser.country;
        doc.province = req.body.wxUser.province;
        doc.city = req.body.wxUser.city;
        doc.gender = req.body.wxUser.gender;
        doc.nickName = req.body.wxUser.nickName;
        doc.openId = req.body.wxUser.openId;
        doc.save(function(err, result){
          if(err){
            throw new Error("绑定失败");
          }
          doc.pwd = undefined;
          
          //记录登陆状态
          funcs.setWxLogin(doc, function(err){
            if(!err){
              res.json({success: true, "msg": "绑定微信成功", userInfo: doc});
            }else{
              res.json({success: false, "msg": "绑定微信发生错误！请重试"});
            }
          });
        });
      }else{
        res.json({success: false, "msg": "用户名或密码错误"});
      }
    })
    .catch(function(err){
      res.json({success: false, "msg": "发生错误"});
      console.log(err);
    });
  },

  wxReg: function(req, res, next){
    var that = this;
    if(!req.body.name || !req.body.pwd || !req.body.email){
      res.json({success: false, msg: '账号、密码、邮箱必填'});
      return false;
    }
    //发送邮件
    function sendMail(){
      var smtpConfig = {
          host: config.email.host,
          port: 465,
          secure: true, // use SSL 
          auth: {
              user: config.email.user,
              pass: config.email.pwd
          }
      };
      var transporter = nodemailer.createTransport(smtpConfig);
      var mailOptions = {
        from: '"JSpapa.com" <'+config.email.user+'>',
        to: req.body.email,
        subject: '恭喜您，注册账号成功！--JSpapa.com',
        text: '注册账号成功',
        html: '<p>尊敬的 <b>'+req.body.name+'</b>：</p><p>您已经通过微信小程序注册账号并绑定微信成功！欢迎您加入JSpapa.com。</p><p>JSpapa是专业的JS开发者社区，这里聚集了大量的JS开发者，或者对JS有兴趣的开发人员。</p><p>您可以在这里提问、解答问题、发表技术研究、提出技术畅想、结交技术伙伴……</p><p>我们真诚的邀请您来共同维护和发展这个朝气蓬勃的社区。</p><p>祝好。</p><p>--邮件发自<a href="http://jspapa.com"><b>JSpapa.com</b></a></p>' // html body
      };
      transporter.sendMail(mailOptions, function(err, info){
        if(err){
          console.log(err);
          res.json({success: false, "msg": err.toString()});
          return;
        }
      });
    }

    M.User.findOne({"$or": [{"name": req.body.name}, {"email": req.body.email}]}).exec()
    .then(function(result){
      if(result){
        var msg = "";
        if(result.name === req.body.name){
          msg = req.body.name+" 用户名已被注册";
        }else{
          msg = req.body.email+" 邮箱已被注册";
        }
        res.json({success: false, "msg": msg});
      }else{
        req.body.pwd = crypto.createHash('md5').update(req.body.pwd).digest('hex');
        req.body.created = new Date();
        M.User.create(req.body, function(err, doc){
          if(err){
            console.log(err);
            res.json({success: false, "msg": '发生错误'});
          }else{

            sendMail();

            res.json({success: true, "msg": '注册成功'});

            //用户数计数
            M.Site.updateUsers();

            //注册成功积分变动
            M.User.updatePointById(doc._id, "register");

            //注册者消息+1
            M.User.updateMessageById(doc._id);

            //给注册者发送积分变动消息
            M.Message.create({
              sender: {
                "name": "admin"
              },
              addressee: {
                "_id": doc._id,
                "name": doc.name
              },
              content: {
                point: config.pointRules.register,
                reason: "注册成功"
              },
              type: "point"
            });
          }
        });
      }
    })
    .catch(function(err){
      console.log(err);
      res.json({success: false, "msg": '注册发生错误'});
    });

  },

  getWxUserTopics: function(req, res, next){
    funcs.checkWxLogin(req.params.openId, function(doc){
      if(doc){

        var userId = doc.user._id;
        var cur = req.query.page ? Number(req.query.page) : 1;
        var limit = 15;
        var skip = (cur - 1) * limit;
        var data = {};


        M.Topic.count({"user._id": userId}).exec()
        .then(function(count){
          data.page = {"total": Math.ceil(count/limit), "count": count, "cur": cur};
        })
        .then(function(){
          return M.Topic.find({"user._id": userId}).sort({"created": -1}).skip(skip).limit(limit).exec();
        })
        .then(function(userTopics){
          data.topics = userTopics;
          data.success = true;
          res.json(data);
        })
        .catch(function(err){
          res.status(500);
          res.json({success: false, msg: "获取用户话题出错"});
          console.log(err);
        });

      }else{
        return res.json({success: false, msg: "请先登陆后操作！"});
      }
    })
  },

  getWxUserReplies: function(req, res, next){
    funcs.checkWxLogin(req.params.openId, function(doc){
      if(doc){

        var userId = doc.user._id;
        var cur = req.query.page ? Number(req.query.page) : 1;
        var limit = 15;
        var skip = (cur - 1) * limit;
        var data = {};


        M.User.findOne({"_id": userId}).exec()
        .then(function(userDoc){
          if(userDoc){
            data.user = userDoc;
          }else{
            res.json({success: false, msg: "没有此用户！"});
            throw new Error("没有此用户："+uname);
          }
        })
        .then(function(){
          return M.Topic.find({"_id": {"$in": data.user.replies}}).exec();
        })
        .then(function(repliesDoc){
          //重新按评论顺序排序
          var newrepliesDoc = [];
          var rlen = repliesDoc.length;
          for(var i=0; i<rlen; i++){
            for(var j=0; j<rlen; j++){
              if(repliesDoc[j]["_id"].toString() === data.user.replies[i].toString()){
                newrepliesDoc.push(repliesDoc[j]);
              }
            }
          }
          data.topics = newrepliesDoc.reverse();
        })
        .then(function(){
          data.page = {"total": 1, "count": 10, "cur": 1};
          data.success = true;
          res.json(data);
        })
        .catch(function(err){
          res.status(500);
          res.json({success: false, msg: "获取参与话题出错"});
          console.log(err);
        });

      }else{
        return res.json({success: false, msg: "请先登陆后操作！"});
      }
    })
  },

  getWxUserMsgs: function(req, res, next){
    funcs.checkWxLogin(req.params.openId, function(doc){
      if(doc){

        var userId = doc.user._id;
        var cur = req.query.page ? Number(req.query.page) : 1;
        var limit = 15;
        var skip = (cur - 1) * limit;
        var query = {"addressee._id": userId};
        var data = {};

        M.Message.find(query, null, {'skip': skip, 'limit': limit, 'sort': {"created": -1}}).exec()
        .then(function(docs){
          data.msgs = docs;
        })
        .then(function(){
          return M.Message.count(query).exec();
        })
        .then(function(count){
          data.page = {'total': Math.ceil(count/limit), 'count': count, 'cur': cur};
          data.success = true;
          res.json(data);
        })
        .catch(function(err){
          res.status(500);
          res.json({success: false, msg: "获取个人信息出错"});
          console.log(err);
        });

      }else{
        return res.json({success: false, msg: "请先登陆后操作！"});
      }
    })
  },

  setMsgRead: function(req, res, next){
    funcs.checkWxLogin(req.params.openId, function(doc){
      if(doc){

        var mid = req.params.id;
        var userId = doc.user._id;

        M.Message.update({"_id": mid}, {$set: {"read": true}}).exec()
        .then(function(){
          return M.User.update({"_id": userId}, {$inc: {"message": -1}}).exec();
        })
        .then(function(){
          res.json({success: true, msg: "信息设置为已读成功"});
        })
        .catch(function(err){
          console.log(err);
          res.status(500);
          res.json({success: false, msg: "信息设置为已读出现错误"});
        });

      }else{
        return res.json({success: false, msg: "请先登陆后操作！"});
      }
    })
  },

  createTopic: function(req, res, next){
    funcs.checkWxLogin(req.body.openId, function(doc){
      if(doc){

        if(!req.body.cate || !req.body.title || !req.body.content){
          res.json({success: false, "msg": "板块、标题、内容不能为空"});
          return false;
        }

        var userId = doc.user._id;
        var createTime = new Date();
        req.body.created = createTime;
        req.body.sorted = createTime;
        req.body.user = {
          _id: userId,
          name: doc.user.name
        }

        M.Topic.create(req.body)
        .then(function(topicDoc){
          return topicDoc;
        })
        .then(function(topicDoc){
          M.User.update({"_id": userId}, {"$push": {"topics": {"$each": [topicDoc._id], "$slice": -10}}}).exec();
          return topicDoc;
        })
        .then(function(topicDoc){
          //发帖数计数器
          M.Site.updateTopics();

          //发布主题积分变动
          M.User.updatePointById(userId, "publishTopic");

          //发布主题者消息+1
          M.User.updateMessageById(userId);

          //给发布主题者发送积分变动消息
          M.Message.create({
            sender: {
              "name": "admin"
            },
            addressee: doc.user,
            content: {
              title: topicDoc.title,
              point: config.pointRules.publishTopic,
              reason: "发布主题"
            },
            type: "point"
          });

          return topicDoc;

        })
        .then(function(topicDoc){
          //刷新用户session
          res.json({success: true, "msg": "发布成功", id:topicDoc._id});
          
        })
        .catch(function(err){
          res.status(500);
          res.json({success: false, msg: "发布出错"});
          console.log(err);
        });
      }else{
        return res.json({success: false, msg: "请先登陆后操作！"});
      }
    })
  }
}

module.exports = funcs;