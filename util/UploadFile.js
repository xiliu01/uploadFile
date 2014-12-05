{{#class}}
	singleton: true,
	alternateClassName: 'UploadFile',
	requires:[
		'ETFramework.util.Uuid'
	],
	//上传组件初始化
	uploadStart:function(component){
		component.setData({
			successPath:new Array(),
			failPath:new Array()
		});
	},
	//上传成功处理
	uploadSuccess:function(component,path){
		var successPath=component.getData().successPath;
		var failPath=component.getData().failPath;
		var failIndex = failPath.lastIndexOf(path);
		if(failIndex!=-1){
			failPath.splice(failIndex,1);
		}else{
			var successIndex=successPath.lastIndexOf(path);
			if(successIndex!=-1){
				successPath.splice(successIndex,1);
			}
			successPath.push(path);
		}
		component.setData({
			successPath:successPath,
			failPath:failPath
		});
	},
	//上传失败处理
	uploadFail:function(component,path){
		var successPath=component.getData().successPath;
		var failPath=component.getData().failPath;
		var failIndex = failPath.lastIndexOf(path);
		if(failIndex!=-1){
			failPath.splice(failIndex,1);
		}
		failPath.push(path);//上传失败图片地址队列
		component.setData({
			successPath:successPath,
			failPath:failPath
		});
	},
	//删除处理
	uploadDelete:function(component,path,store){
		var record = store.findRecord('img_path',path);
		console.log('删除'+record);
		var file_online = record.get('img_path_online');
		console.log(file_online);
		if(file_online != undefined){
			UploadFile.showWorkDelete(file_online);
		}
		var successPath=component.getData().successPath;
		var failPath=component.getData().failPath;
		var failIndex = failPath.lastIndexOf(path);
		if(failIndex!=-1){
			failPath.splice(failIndex,1);
		}else{
			var successIndex=successPath.lastIndexOf(path);
			if(successIndex!=-1){
				successPath.splice(successIndex,1);
			}
		}
		component.setData({
			successPath:successPath,
			failPath:failPath
		});
	},
	//上传需要设置
	/**
		拍照
	*/
	takePhoto: function(store,component,view,quality,isOne){
		if(component.getData()==null){
			UploadFile.uploadStart(component);
		}
		UploadeUtils.takePhoto(onSuccess, onFail, quality);
		var body = this;
		
		function onFail() {
			console.log('========拍摄失败============');
		}
		
		function onSuccess(img) {
			if(isOne == true){
			    var count=store.getCount();
			    if(count!=0){
			    	var path=store.getData().getAt(0).get('img_path');
			    	UploadFile.uploadDelete(component,path,store);
			    }
			    store.removeAt(0);
			}
			UploadFile.setPicPath(store, img);
		    UploadFile.setWallHeight(store, view);
		    UploadFile.uploadPicture(img,store,component);
		}
	},

	//上传需要设置
	/*
		选择图片
	*/
	selectPicture: function(store,component,view,quality){
		if(component.getData()==null){
			UploadFile.uploadStart(component);
		}
		console.log(store);
		UploadeUtils.selectPicture(onSuccess, onFail, quality);
		function onSuccess(img) {
			var imgName=uuid.v1().replace(/-/g,"")+'.jpg';
			imgName=UploadeUtils.copyRenamePhoto(img,imgName,onCopySuccess);

			function onCopySuccess(entry) {
				console.log(JSON.stringify(entry));
				UploadFile.setPicPath(store, entry.nativeURL);
			    UploadFile.setWallHeight(store,view);
			    UploadFile.uploadPicture(entry.nativeURL,store,component);
			}
		}

		function onFail() {
		}
	},

	//图片上传
	uploadPicture: function(path,store,component,otherBusiness) {
		var userCode = localStorage.user_code;//临时账号
		var webUrl = bcpConfig.longinURL; //localStorage.mybase_url;
		var uploadName =  UploadeUtils.uploadPic(webUrl, path, userCode, otherBusiness||onSuccess, onFail);//返回服务器端文件名
		function onSuccess(message) {
			UploadFile.uploadSuccessCallBack(message,path,store,component);
		}		
		function onFail() {
			console.log('上传失败');
			UploadFile.uploadFail(component,path);
		}
		return uploadName;
	},
	//删除服务器图片
	showWorkDelete: function(online_path){
		ETFramework.Backend.request({
			bo: 'et.util.ImageUtil',
			params: {
				action: 'delete',
				online_path: online_path
			},
			callback: function(err,flag,args) {
				console.log(JSON.stringify(arguments));
				if(err){
				}else{
					if(flag == "true"){
						console.log('删除服务器文件成功');
					}else{
						console.log('删除服务器文件失败');
					}
				}
			},
			scope: this
	    });
	},
	//上传成功回调函数
	uploadSuccessCallBack: function(message,path,store,component){
		var dd = JSON.stringify(message);
		var json = JSON.parse(dd);
		var state = json.responseCode;
		var file = (JSON.parse(json.response)).retmsg;
		console.log(state);
		if(state == 200 || state == "200") {
			if(file != "false"){
				console.log('图片上传成功');
				UploadFile.uploadSuccess(component,path);
				var record = store.findRecord('img_path',path);
				if(record != null){
					record.set('img_path_online',file);
				}else{
					UploadFile.showWorkDelete(file);
				}
			}else{
				console.log('图片上传失败');
				UploadFile.uploadFail(component,path);
			}
		}else{
			UploadFile.uploadFail(component,path);
			console.log('图片上传失败');
		}
	},
	/*
		给store添加数据
	*/
	setPicPath: function(store, path) {
		console.log(store);
		if(store.getCount() < 10) {
			//alert(store.getCount()+" "+path);
			store.insert(0, {
		    	'img_path': path,
		    	'hidden': '',
		    	'border': '0px'
			});
			if(store.getCount() == 10) {
				var record = store.findRecord('id','000000000000001');
				record.getData().hidden = 'none';
				store.fireEvent('refresh');	//刷新store
			}
		} else {
			ViewSwitch.toast('最多添加9张图片')
		}
	},

	/*
		动态设置图片墙的高度
	*/
	setWallHeight: function(store,view) {
		var num = store.getCount();
		if (num<=3) {
			view.setHeight('5.5em');
		}else if(num > 3 && num <7){
			view.setHeight('11.5em');
		} else if (num >= 7 && num <10) {
			view.setHeight('17.3em');
		};
	},

	//上传离开页面，需要设置
	//返回时清空图片Store,对组件进行初始化，并且清空缓存，需要在UploadeUtils中设置
	clearData: function(store,component) { 
		UploadeUtils.clearDirectory();
		UploadFile.uploadStart(component);
		store.removeAll(); 
		store.add({ 
			id: '000000000000001', 
			img_path: 'resources/icons/24.png', 
			border: '0px', 
			hidden: '' 
		}); 
	},
	//获取所有上传成功的路径
	getOnlinePath : function(store){
		var imgPaths = [];
		store.each(function(record) {
			var fileURI = record.getData().img_path_online;
			if(fileURI != undefined){
				imgPaths.push(fileURI);
			}
		});
		return imgPaths;
	},
	//提交所有失败的文件
	recommitFailFile: function(store,component){
		var failPath = component.getData().failPath;
		var successPath = component.getData().successPath;
		var count = 0;
		var failPathCount = failPath.length;
		var successFlag = false;
		failPath.forEach(function(path){
			count = count + 1;
            UploadFile.uploadPicture(path,store,component,
                function(message){
                    UploadFile.uploadSuccessCallBack(message,path,store,component);
                    if(failPath.length == 0 && successPath.length != 0){
                    	successFlag = true;
                    	return true;
                    }
                }
            );
            if(failPathCount == count){
            	if(successFlag == false){
            		ViewSwitch.toast("您没拍照片或图片上传失败");
            		return false;
            	}
            }
        });
	}
{{/class}}
