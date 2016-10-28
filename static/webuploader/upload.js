function uploader(route, cb) {
  var uploader = WebUploader.create({
      auto: true,
      // swf文件路径
      swf: '/webuploader/Uploader.swf',

      // 文件接收服务端。
      server: route+'/upload',

      // 选择文件的按钮。可选。
      // 内部根据当前运行是创建，可能是input元素，也可能是flash.
      pick: '#picker',

      // 不压缩image, 默认如果是jpeg，文件上传前会压缩一把再上传！
      resize: false,

      // 只允许选择图片文件。
      accept: {
          title: 'Images',
          extensions: 'gif,jpg,jpeg,png',
          mimeTypes: 'image/*'
      },

      fileSingleSizeLimit: 1000*2000
  });

  // 文件上传过程中创建进度条实时显示。
  uploader.on( 'uploadProgress', function( file, percentage ) {
      var $pickerTip = $( '#pickerTip' );
      $pickerTip.show().text('上传中...'+percentage * 100 + '%');
  });


  uploader.on( 'uploadSuccess', function( file, response ) {
      cb && cb(file, response);
  });

  uploader.on( 'uploadError', function( file ) {
      alert('上传出错');
  });

  uploader.on( 'uploadComplete', function( file ) {
      $( '#'+file.id ).find('.progress').fadeOut();
      $( '#pickerTip' ).text('').fadeOut();
  });

  uploader.on( 'error', function( type ) {
    if(type == "F_EXCEED_SIZE"){
      alert("文件不能大于2M");
    }
  });


  $("#reply-input").on('keydown',function(e){
      if(e.keyCode == 9){
          e.preventDefault();
          var indent = '    ';
          var start = this.selectionStart;
          var end = this.selectionEnd;
          var selected = window.getSelection().toString();
          selected = indent + selected.replace(/\n/g,'\n'+indent);
          this.value = this.value.substring(0,start) + selected + this.value.substring(end);
          this.setSelectionRange(start+indent.length,start+selected.length);
      }
  })
}