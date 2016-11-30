var config = require('../../config');
var markdown = require('markdown').markdown;
var M = require('../../models');

module.exports = {

  listTopics: function(req, res, next){
    
    var cid = req.params.id;
    
    var query;
    if(!cid || cid === "all"){
      query = req.query.type ? {"type": req.query.type} : {};
    }else{
      query = req.query.type ? {"cate": cid, "type": req.query.type} : {"cate": cid};
    }

    var cur = req.query.page ? Number(req.query.page) : 1;
    var limit = 15;
    var skip = (cur - 1) * limit;

    var data = {};

    M.Topic.find(query, {content:0}, {'skip': skip, 'limit': limit, 'sort': {"sorted": -1}}).exec()
    .then(function(topicDocs){
      data.topics = topicDocs;
    })
    .then(function(){
      return M.Topic.count(query).exec();
    })
    .then(function(count){
      data.page = {'total': Math.ceil(count/limit), 'count': count, 'cur': cur}
    })
    .then(function(){
      res.json(data);
    })
    .catch(function(err){
      res.json({success: false, msg: err});
    });
  },

  showTopic: function(req, res, next) {
    var id = req.params.id;
    var data = {};

    if (id.length !== 24) {
      return res.json({success: false, msg: "主题ID错误"});
    }

    M.Topic.findOne({"_id": id}).exec()
    .then(function(topicDoc){
      if(topicDoc){
        topicDoc.content = markdown.toHTML(topicDoc.content);
        return data.topic = topicDoc;
      }else{
        res.json({success: false, msg: "404，没有此主题"});
        throw new Error("未找到主题");
      }

    })
    .then(function(topicDoc){
      return M.User.findOne({"_id": topicDoc.user._id}).exec();
    })
    .then(function(authorDoc){
      authorDoc.pwd = undefined;
      authorDoc.email = undefined;
      data.author = authorDoc;
      return authorDoc.topics;
    })
    .then(function(authorTopicsIds){
      return M.Topic.find({"_id": {"$in": authorTopicsIds}}, {content:0}, {'sort': {"created": -1}}).exec();
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
      res.json(data);
    })
    .catch(function(err){
      res.json({success: false, msg: err});
    });

    //浏览主题计数器
    M.Topic.updateVeiwsById(id);
  }



}
