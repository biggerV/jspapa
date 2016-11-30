var express = require('express');
var bodyParser = require('body-parser');
var Topics = require('./topics');
var WxUser = require('./wxUser');

var router = express.Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

//主题列表
router.get('/topics/:id', Topics.listTopics);

//单个主题
router.get('/topic/:id', Topics.showTopic);

//微信用户获取
router.post('/getWxUser', WxUser.getWxUser);

//微信绑定
router.post('/wxBind', WxUser.setWxBind);

//微信注册绑定
router.post('/wxReg', WxUser.wxReg);

//发布的话题
router.get('/getWxUserTopics/:openId', WxUser.getWxUserTopics);

//参与的话题
router.get('/getWxUserReplies/:openId', WxUser.getWxUserReplies);

//信息
router.get('/getWxUserMsgs/:openId', WxUser.getWxUserMsgs);

//信息设为已读
router.get('/setMsgRead/:id/:openId', WxUser.setMsgRead);

//创建话题
router.post('/createTopic', WxUser.createTopic);

module.exports = router;
