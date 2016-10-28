var express = require('express');
var bodyParser = require('body-parser');
var C = require('../controllers/topic');

var router = express.Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

//topic首页跳到主页
router.get('/', C.home);

//显示主题详情
router.get('/show/:id', C.show);

//添加评论
router.post('/show/:id',  C.reply);

//新增主题页面
router.get('/create', C.create);

//保存新主题
router.post('/create', C.save);

//删除主题
router.get('/del/:id', C.del);

//good:精华、top:置顶
router.get('/type/:id/:type', C.setType);

//编辑主题
router.get('/edit/:id', C.edit);

//保存编辑的主题
router.post('/edit/:id', C.update);

//上传图片接口
router.post('/upload/', C.uploadPicSet, C.uploadPic);

module.exports = router;
