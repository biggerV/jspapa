var config = require('../config');
var multer  = require('multer');
var markdown = require('markdown').markdown;
var M = require('../models');

var upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, config.uploadPath+"/topic");
    },
    filename: function (req, file, cb) {
      cb(null, req.session.user.name +"-"+Date.now())
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
  home: function(req, res, next) {
    res.redirect(301, "/");
  },

  show: function(req, res, next) {
    var id = req.params.id;
    var data = {};

    M.Topic.findOne({"_id": id}).exec()
    .then(function(topicDoc){
      topicDoc.content = markdown.toHTML(topicDoc.content);
      return data.topic = topicDoc;
    })
    .then(function(topicDoc){
      return M.User.findOne({"_id": topicDoc.user._id}).exec();
    })
    .then(function(authorDoc){
      data.author = authorDoc;
      return authorDoc.topics;
    })
    .then(function(authorTopicsIds){
      return M.Topic.find({"_id": {"$in": authorTopicsIds}}, null, {'sort': {"created": -1}}).exec();
    })
    .then(function(authorTopics){
      data.authorTopics = authorTopics;
    })
    .then(function(){
      return M.Comment.find({"topicId": id}).exec();
    })
    .then(function(topicComments){
      var l = topicComments.length;
      for(var i = 0; i < l; i++){
        topicComments[i]["content"] = markdown.toHTML(topicComments[i]["content"]);
      }
      data.comment = topicComments;
    })
    .then(function(){
      data.cate = {"id": data.topic.cate, "name": config.cates[data.topic.cate]};
      res.render('topic', data);
    })
    .catch(function(err){
      console.log(err);
    });

    //浏览主题计数器
    M.Topic.updateVeiwsById(id);
  },

  create: function(req, res, next) {
    if(!req.session.user){
      req.session.lastpage = "/topic/create";
      res.redirect("/login");
      return false;
    }

    res.render('topic-create', {"topic": {}, "isCreate": true});
  },

  save: function(req, res, next) {
    if(!req.session.user){
      res.redirect("/login");
      return false;
    }else if(!req.body.cate || !req.body.title || !req.body.content){
      res.render('topic-create', {"msg": "板块、标题、内容不能为空"});
      return false;
    }

    var createTime = new Date();

    req.body.user = {
      "_id": req.session.user._id,
      "name": req.session.user.name
    }

    req.body.created = createTime;
    req.body.sorted = createTime;

    M.Topic.create(req.body)
    .then(function(topicDoc){
      return topicDoc;
    })
    .then(function(topicDoc){
      M.User.update({"_id": req.body.user._id}, {"$push": {"topics": {"$each": [topicDoc._id], "$slice": -10}}}).exec();
      return topicDoc;
    })
    .then(function(topicDoc){
      //发帖数计数器
      M.Site.updateTopics();

      //发布主题积分变动
      M.User.updatePointById(req.session.user._id, "publishTopic");

      //发布主题者消息+1
      M.User.updateMessageById(req.session.user._id);

      //给发布主题者发送积分变动消息
      M.Message.create({
        sender: {
          "name": "admin"
        },
        addressee: {
          "_id": req.session.user._id,
          "name": req.session.user.name
        },
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
      M.User.findOne({"_id": req.session.user._id}, function(err, newUserInfo){
        req.session.user = newUserInfo;

        res.redirect('/topic/show/'+topicDoc._id);
      });
      
    })
    .catch(function(err){
      console.log(err);
    });
  },

  del: function(req, res, next) {
    var tid = req.params.id;

    if(req.session.user.level < 90){
      res.render("error", {"msg": "没有权限！"});
      return false;
    }


    M.Topic.findOneAndRemove({"_id": tid}).exec()
    .then(function(doc){
      res.redirect("/");

      //主题被删除积分变动
      M.User.updatePointById(doc.user._id, "delTopic");

      //主题被删除者消息+1
      M.User.updateMessageById(doc.user._id);

      //给主题被删除者发送积分变动消息
      M.Message.create({
        sender: {
          "name": "admin"
        },
        addressee: {
          "_id": doc.user._id,
          "name": doc.user.name
        },
        content: {
          point: config.pointRules.delTopic,
          reason: "主题被删除"
        },
        type: "point"
      });
    })
    .catch(function(err){
      console.log(err);
    });
  },

  setType: function(req, res, next) {
    var tid = req.params.id;
    var type = req.params.type;
    var cancel = req.query.cancel;

    if(cancel === "true"){
      type = "";
    }

    if(req.session.user.level < 90){
      res.render("error", {"msg": "没有权限！"});
      return false;
    }

    M.Topic.findOneAndUpdate({"_id": tid}, {"$set": {"type": type}}).exec()
    .then(function(doc){
      if(type === "top"){
        //更新帖子排序
        M.Topic.updateSortedById(tid, "top");

        //主题被置顶积分变动
        M.User.updatePointById(doc.user._id, "topicTop");

      }else if(type === "good"){
        M.Topic.updateSortedById(tid);

        //主题被设精积分变动
        M.User.updatePointById(doc.user._id, "topicGood");
      }

      if(type==="top" || type==="good"){
        //被置顶/设精者消息+1
        M.User.updateMessageById(doc.user._id);

        //给被置顶/设精者发送积分变动消息
        M.Message.create({
          sender: {
            "name": "admin"
          },
          addressee: {
            "_id": doc.user._id,
            "name": doc.user.name
          },
          content: {
            title: doc.title,
            point: type==="top" ? config.pointRules.topicTop : config.pointRules.topicGood,
            reason: type==="top" ? "主题被置顶" : "主题被设为精华"
          },
          type: "point"
        });
      }
      res.redirect("/");
    })
    .catch(function(err){
      console.log(err);
    });
  },
  
  edit: function(req, res, next) {
    var tid = req.params.id;

    if(!req.session.user){
      res.redirect("/login");
      return false;
    }

    M.Topic.findOne({"_id": tid}, function(err, doc){
      if(err){
        res.render("error", {"msg": "不存在此主题！"});
        return false;
      }else{
        if(req.session.user._id !== doc.user._id.toString()){
          res.redirect("/login");
          return false;
        }
        res.render("topic-create", {"topic": doc, "isCreate": false});
      }
    });
  },

  update: function(req, res, next) {
    var tid = req.params.id;

    if(!req.session.user){
      res.redirect("/login");
      return false;
    }


    M.Topic.findOne({"_id": tid}).exec()
    .then(function(topicDoc){

      if(req.session.user._id !== topicDoc.user._id.toString()){
        res.redirect("/login");
        return false;
      }

      return topicDoc;
    })
    .then(function(topicDoc){

      topicDoc.title = req.body.title;
      topicDoc.content = req.body.content;
      topicDoc.cate = req.body.cate;

      topicDoc.save(function(err, doc){
        if(err){
          res.render("error", {"msg": "保存出现错误！"});
        }else{
          res.redirect('/topic/show/'+tid);
        }
      });
    })
    .catch(function(err){
      console.log(err);
    });
  },

  reply: function(req, res, next) {
    var tid = req.params.id;

    if(!req.session.user){
      req.session.lastpage = "/topic/show/"+tid+"#reply";
      res.redirect("/login");
      return false;
    }

    req.body.user = {
      "_id": req.session.user._id,
      "name": req.session.user.name
    }
    req.body.topicId = tid;
    req.body.created = new Date();

    var setUserReplies = function(){
      //最近评论过的10个主题，去重，保持10个
      var ureplies = req.session.user.replies;
      var tidIdx = ureplies.indexOf(tid);
      if(tidIdx > -1){
        ureplies.splice(tidIdx,1);
      }
      ureplies.push(tid);
      if(ureplies.length > 10){
        ureplies.shift(0);
      }
      return ureplies;
    }

    //处理@someone为链接到用户个人页面
    var atNames = req.body.content.match(/@[A-Za-z0-9]+/g) || [];
    var atNamesLen = atNames.length;
    var atUser = [];
    if(atNamesLen>0){
      for(var i=0; i<atNamesLen; i++){
        var uname = atNames[i].replace("@","");
        req.body.content = req.body.content.replace(atNames[i], "["+atNames[i]+"]"+"(/user/"+uname+")");
        atUser.push(uname);
      }
    }


    var commentDoc;

    M.Comment.create(req.body)
    .then(function(doc){
      commentDoc = doc;
    })
    .then(function(){
      var userReplies = setUserReplies();
      M.User.update({"_id": req.body.user._id}, {"$set": {"replies": userReplies}}).exec();
    })
    .then(function(){
      //此主题回帖数计数
      M.Topic.updateCommentsById(tid);

      //此主题最后回复时间
      M.Topic.updateRepliedById(tid);

      //总回帖数计数
      M.Site.updateCommets();

      //题主
      return M.Topic.findOne({"_id": tid}).exec();
    })
    .then(function(doc){

      //更新帖子排序
      if(doc.type !== "top"){
        M.Topic.updateSortedById(tid);
      }

      //如果不是在回复自己的主题则发消息通知题主
      if(doc.user.name !== req.session.user.name){

          //题主未读消息+1
          M.User.updateMessageById(doc.user._id);

          //给题主发送消息
          M.Message.create({
            sender: req.body.user,
            addressee: doc.user,
            content: {
              topicId: doc._id,
              title: doc.title,
              commentId: commentDoc._id,
              comment: commentDoc.content
            },
            type: "comment"
          });

        }

        //向被@的用户发消息
        if(atNamesLen>0){
          M.User.find({"name": {$in: atUser}}).exec()
          .then(function(docs){
            if(docs){
              for(var i=0; i<docs.length; i++){
                M.User.updateMessageById(docs[i]._id);

                M.Message.create({
                  sender: req.body.user,
                  addressee: {
                    "_id": docs[i]._id,
                    "name": docs[i].name
                  },
                  content: {
                    topicId: doc._id,
                    title: doc.title,
                    commentId: commentDoc._id,
                    comment: commentDoc.content
                  },
                  type: "reply"
                });
              }
            }
          });
        }

        return doc;
    })
    .then(function(doc){
      //评论别人的主题才加积分
      if(req.session.user.name !== doc.user.name){
        //评论主题评论者积分变动
        M.User.updatePointById(req.session.user._id, "commentTopic");

        //评论者消息+1
        M.User.updateMessageById(req.session.user._id);

        //给评论者发送消息
        M.Message.create({
          sender: {
            "name": "admin"
          },
          addressee: {
            "_id": req.session.user._id,
            "name": req.session.user.name
          },
          content: {
            title: doc.title,
            point: config.pointRules.commentTopic,
            reason: "评论主题"
          },
          type: "point"
        });
      }

    })
    .then(function(){
      //刷新用户session
      M.User.findOne({"_id": req.session.user._id}, function(err, newUserInfo){
        req.session.user = newUserInfo;

        res.redirect('/topic/show/'+tid+'#'+commentDoc._id);
      });
      
    })
    .catch(function(err){
      console.log(err);
    });
  },

  uploadPicSet: upload.single('file'),

  uploadPic: function(req, res, next){
    if(req.file){
      res.json({"pic": "/topic/"+req.file.filename});
    }else{
      res.json({"success": false});
    }
  }
}