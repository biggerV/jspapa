/*--------------------------
 Validate （表单验证）
---------------------------*/
;(function($) {
	var Validate = {
		test : function(v, rule) { // 如果通过验证，返回true，否则返回错误原因
			v = $.trim((typeof v == 'object') ? v.val() : v);
			var t = '';
			switch (rule) {
			case 'required':
				if (v.length < 1)
					t = '不能为空';
				break;
			case 'email':
				if (v.length > 0 && !/^[\w\.\_\-]+@[\w\.\_\-]+(\.[\w\-]{2,3}){1,2}$/.test(v))
					t = '邮箱格式不正确';
				break;
			case 'idCard':{
				var id1=/^[1-9]\d{7}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}$/;// 身份证(15位)
				var id2=/^[1-9]\d{5}[1-9]\d{3}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])((\d{4})|(\d{3}x))$/i;// 身份证(18位)
				if ( v.length >0 &&(!id1.test(v)&&!id2.test(v))){
					t="身份证号不正确";
					break;
				}
			}
			case 'url':
				if (v.length > 0 && !/^[a-zA-z]+:\/\/(\w+(-\w+)*)(\.(\w+(-\w+)*))*(\?\S*)?$/.test(v))
					t = '网址格式不正确，如:http://www.google.com';
				break;
			case 'phone':
				if (v.length > 0 && !/(^(0\d{2,3}-?)?\d{7,9}(-\d{3,4})?$)|(^1[358]\d{9}$)/.test(v))
					t = '电话号码格式不正确';
				break;
			case 'int':
				if (v.length > 0 && !/^\d*$/.test(v))
					t = '只能为整数';
				break;
			case 'float':
				if (v.length > 0 && !/^\d+(\.\d+)?$/.test(v))
					t = '只能为数字';
				break;
			case 'cnName':
				if (v.length > 0 && !/^[\u4E00-\u9FA5]{2,4}$/.test(v))
					t = '请输入正确的中文名';
				break;
			case 'realName':
				if (v.length > 0 && !/^[\u4E00-\u9FA5A-Za-z\s]{2,16}$/.test(v))
					t = '请输入正确的姓名';
				break;
			case 'telePhone':
				if (v.length > 0 && !/^(0\d{2,3}-?)?\d{7,9}(-\d{3,4})?$/.test(v))
					t = '固定电话格式不正确';
				break;
			case 'mobile':
				if (v.length > 0 && !/^1[358]\d{9}$/.test(v))
					t = '手机号码格式不正确';
				break;
			case 'date':
				if (v.length > 0 && !/^[12][0-9]{3}-[0-9]{2}-[0-9]{2}$/.test(v))
					t = '日期格式不正确，应为2013-12-1';
				break;
 			case 'username':
				if (v.length > 0 && !/^[A-Za-z][A-Za-z0-9]{5,19}$/.test(v))
					t = '用户名长度为6-20，必须字母打头，可以使用英文字母和数字组成';
				break;
			case 'password':
				if (v.length > 0 && !/^[^\s]{6,20}$/.test(v))
					t = '密码长度为6-20';
				break;
			case 'ip':
				if (v.length > 0 && !/((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)/.test(v))
					t = 'IP地址格式不正确';
				break;
			default:
				t = '没有定义表单验证规则："' + rule + '"';
			}
			return t.length > 0 ? t : true;
		}
	};

	$.formValidate = function(str) {
		if (arguments.length == 1)
			$(str).formValidate();
		else if (arguments.length > 1)
			$(str).formValidate(arguments[1]);
	};

	$.fn.formValidate = function(options) {
		var $this = $(this);
		function check() {
			$.formValidate.findError = false;
			$.formValidate.errObj = null;
			$this.contents().find("[validate]").each($.formValidate.checkFormElem);
			if ($.formValidate.findError) {
				//$.formValidate.errObj.focus();
				return false;
			} else {
				return true;
			}
		}
		$this.bind('submit',function(){
			return check();
		});

	};

	$.formValidate.checkFormElem = function() {// 验证单个元素
		$.formValidate.clearError($(this));
		if ($.formValidate.findError)
			return;
		var str = $(this).attr('validate');
		if (!str)
			return;
		var rules = str.split(',');
		for ( var i = 0; i < rules.length; i++) {
			var t = Validate.test($(this), rules[i]);
			if (t != true) {
				t = $.formValidate.getRuleMessage($(this), rules[i], t);
				$.formValidate.bindError($(this), t);
        $(this).focus();
				break;
			} else
				$.formValidate.clearError($(this));
		}
	};

	$.formValidate.getRuleMessage = function(obj, rule, defaultMessage) {
		var msg = obj.attr('data-' + rule + 'Msg');
		if (msg) {
			return msg;
		}
		var dt = obj.parent().prev('dt').text();
		if (dt) {
			defaultMessage = '"' + dt + '"' + defaultMessage;
		}
		return defaultMessage;
	};

	// 设置为错误状态
	$.formValidate.bindError = function(obj, errMsg) {
		showFormErrInfo(obj, errMsg);
		obj.addClass('warning');
		$.formValidate.findError = true;
		if ($.formValidate.errObj == null)
			$.formValidate.errObj = obj;
	};

	// 清除错误状态
	$.formValidate.clearError = function(obj) {
		obj.removeClass('warning');
	};

	$.formValidate.turnOnValidate = function(_con) {
		_con.contents().find("[novalidate]").each(function() {
			turnOnValidateObj($(this));
		});
	};

	$.formValidate.turnOffValidate = function(_con) {
		_con.contents().find("[validate]").each(function() {
			turnOffValidateObj($(this));
			$.formValidate.clearError($(this));
		}); // 隐藏已知错误标识
	};

	$.formValidate.turnOnValidateObj = function(_obj) {
		_obj.attr('validate', _obj.attr('novalidate'));
		_obj.removeAttr('novalidate');
	};

	$.formValidate.turnOffValidateObj = function(_obj) {
		_obj.attr('novalidate', _obj.attr('validate'));
		_obj.removeAttr('validate');
	};

	function showFormErrInfo($obj, errMsg) {
		alert(errMsg);
	}
})(jQuery);
