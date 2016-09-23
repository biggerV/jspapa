var config = require('../config');
var express = require('express');
var mongodb = require('mongodb');
var bodyParser = require('body-parser');
var markdown = require('markdown').markdown;

var router = express.Router();
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

//topic首页跳到主页
router.get('/', function(req, res, next) {
  res.redirect(301, "/");
});


//显示主题详情
router.get('/show/:id', function(req, res, next) {
  var id = req.params.id;

  MongoClient.connect(config.mongodbUrl, function(err, db){
    var topic = db.collection("topic");
    var user = db.collection("user");
    var comment = db.collection("comment");

    topic.findOne({"_id": ObjectId(id)}, function(err, topicResult){

      if(err){
        console.log(err);
      }else{
        user.findOne({"_id": topicResult.user._id}, function(err, authorResult){
          if(err){
            console.log(err);
          }else{
            topicResult.content = markdown.toHTML(topicResult.content);

            comment.find({"topicId": ObjectId(id)}).toArray(function(err, commentResult){
              if(err){
                console.log(err);
              }else{
                var l = commentResult.length;
                for(var i = 0; i < l; i++){
                  commentResult[i]["content"] = markdown.toHTML(commentResult[i]["content"]);
                }

                //作者的其他话题（取最近5条）
                var topicIds = [];
                for(var i=0; i<authorResult.topics.length; i++){
                  topicIds.push(ObjectId(authorResult.topics[i]));
                }
                topic.find({"_id": {"$in": topicIds.slice(0,5)}}).sort({"created": -1}).toArray(function(err, authorTopics){
                  if(err){
                    console.log(err);
                  }else{
                    res.render('topic', {"topic": topicResult, "author": authorResult, "comment": commentResult, "cate": {"id": topicResult.cate, "name": config.cates[topicResult.cate]}, "authorTopics": authorTopics});

                    //浏览主题计数器
                    topic.updateOne({"_id": ObjectId(id)}, {"$inc": {"views": 1}}, function(err, result){
                      if(err){
                        console.log(err);
                      }else{
                        db.close();
                      }
                    });
                  }
                });
              }
            });
            
          }
        });
        
      }
      
    });
    
  });
});


//添加评论
router.post('/show/:id', function(req, res, next) {
  var tid = req.params.id;

  if(!req.session.user){
    req.session.lastpage = "/topic/show/"+tid+"#reply";
    res.redirect("/login");
    return false;
  }

  MongoClient.connect(config.mongodbUrl, function(err, db){
    var comment = db.collection("comment");
    var topic = db.collection("topic");
    var user = db.collection("user");
    var site = db.collection("site");

    req.body.user = {
      "_id": ObjectId(req.session.user._id),
      "name": req.session.user.name
    }
    req.body.topicId = ObjectId(tid);
    req.body.created = new Date();

    comment.insertOne(req.body, function(err, commentResult){
      if(err){
        console.log(err);
      }else{
        //最近评论过的10个主题，去重
        var tidIdx = req.session.user.replies.indexOf(tid);
        if(tidIdx > -1){
          req.session.user.replies.splice(tidIdx,1);
        }
        req.session.user.replies.push(tid);
        if(req.session.user.replies.length > 10){
          req.session.user.replies.shift(0);
        }

        var newReplies = [];
        for(var i=0; i<req.session.user.replies.length; i++){
          newReplies.push(ObjectId(req.session.user.replies[i]));
        }

        user.updateOne({"_id": req.body.user._id}, {"$set": {"replies": newReplies}}, function(err, userResult){
          if(err){
            console.log(err);
          }else{
            res.redirect('/topic/show/'+tid+'#'+commentResult.insertedId);

            //主题回帖数计数器
            topic.updateOne({"_id": req.body.topicId}, {"$inc": {"comments": 1}}, function(err, topicResult){
              if(err){
                console.log(err);
              }else{
                //总回帖数计数器
                site.updateOne({"name": "counter"}, {"$inc": {"comments": 1}}, function(err, siteResult){
                  if(err){
                    console.log(err);
                  }else{
                    db.close();
                  }
                });
              }
            });

          }
        });
      }
    });
  });
  
});

//新增主题页面
router.get('/create', function(req, res, next) {

  if(!req.session.user){
    req.session.lastpage = "/topic/create";
    res.redirect("/login");
    return false;
  }

  res.render('topic-create', {"topic": {}, "isCreate": true});
});

//保存新主题
router.post('/create', function(req, res) {

  if(!req.session.user){
    res.redirect("/login");
    return false;
  }

  MongoClient.connect(config.mongodbUrl, function(err, db){
    var topic = db.collection("topic");
    var user = db.collection("user");
    var site = db.collection("site");

    if(!req.body.cate || !req.body.title || !req.body.content){
      res.render('topic-create', {"msg": "板块、标题、内容不能为空"});
      return false;
    }

    req.body.user = {
      "_id": ObjectId(req.session.user._id),
      "name": req.session.user.name
    }
    req.body.created = new Date();

    topic.insertOne(req.body, function(err, topicResult){
      if(err){
        console.log(err);
      }else{
        user.updateOne({"_id": req.body.user._id}, {"$push": {"topics": {"$each": [topicResult.insertedId], "$slice": -10}}}, function(err, userResult){
          if(err){
            console.log(err);
          }else{
            req.session.user.topics.push(topicResult.insertedId);
            res.redirect('/topic/show/'+topicResult.insertedId);


            //发帖数计数器
            site.updateOne({"name": "counter"}, {"$inc": {"topics": 1}}, function(err, siteResult){
              if(err){
                console.log(err);
              }else{
                db.close();
              }
            });

          }
        });
      }
      
    });
    
  });
});


//删除主题
router.get('/del/:id', function(req, res, next) {
  var tid = req.params.id;

  if(req.session.user.name !== "admin"){
    res.redirect("/login");
    return false;
  }

  MongoClient.connect(config.mongodbUrl, function(err, db){
    var topic = db.collection("topic");

    topic.remove({"_id": ObjectId(tid)}, function(err, result){
      if(err){
        console.log(err);
      }else{
        res.redirect("/");
        db.close();
      }
    });
  });
  
});


//good:精华、top:置顶
router.get('/type/:id/:type', function(req, res, next) {
  var tid = req.params.id;
  var type = req.params.type;

  if(req.session.user.name !== "admin"){
    res.redirect("/login");
    return false;
  }

  MongoClient.connect(config.mongodbUrl, function(err, db){
    var topic = db.collection("topic");

    topic.updateOne({"_id": ObjectId(tid)}, {"$set": {"type": type}}, function(err, result){
      if(err){
        console.log(err);
      }else{
        res.redirect("/");
        db.close();
      }
    });
  });
  
});

//编辑主题
router.get('/edit/:id', function(req, res, next) {
  var tid = req.params.id;

  if(!req.session.user){
    res.redirect("/login");
    return false;
  }

  MongoClient.connect(config.mongodbUrl, function(err, db){
    var topic = db.collection("topic");

    topic.findOne({"_id": ObjectId(tid)}, function(err, result){
      if(err){
        console.log(err);
      }else{
        if(req.session.user._id !== result.user._id.toString()){
          res.redirect("/login");
          return false;
        }
        res.render("topic-create", {"topic": result, "isCreate": false});
        db.close();
      }
    });
  });
  
});


//保存编辑的主题
router.post('/edit/:id', function(req, res, next) {
  var tid = req.params.id;

  if(!req.session.user){
    res.redirect("/login");
    return false;
  }

  MongoClient.connect(config.mongodbUrl, function(err, db){
    var topic = db.collection("topic");

    topic.findOne({"_id": ObjectId(tid)}, function(err, result){
      if(err){
        console.log(err);
      }else{
        if(req.session.user._id !== result.user._id.toString()){
          res.redirect("/login");
          return false;
        }

        req.body.updated = new Date();

        topic.updateOne({"_id": ObjectId(tid)}, {"$set": req.body}, function(err, result){
          if(err){
            console.log(err);
          }else{
            res.redirect('/topic/show/'+tid);
            db.close();
          }
        });

      }
    });


  });
  
});

module.exports = router;
