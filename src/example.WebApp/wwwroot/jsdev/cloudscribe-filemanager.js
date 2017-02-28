﻿(function () {
    var fileManager = {
        treeDataApiUrl: $("#config").data("filetree-url"),
        uploadApiUrl: $("#config").data("upload-url"),
        createFolderApiUrl: $("#config").data("create-folder-url"),
        deleteFolderApiUrl: $("#config").data("delete-folder-url"),
        renameFolderApiUrl: $("#config").data("rename-folder-url"),
        deleteFileApiUrl: $("#config").data("delete-file-url"),
        renameFileApiUrl: $("#config").data("rename-file-url"),
        canDelete: $("#config").data("can-delete"),
        emptyPreviewUrl:$("#config").data("empty-preview-url"),
        rootVirtualPath: $("#config").data("root-virtual-path"),
        fileSelectorButton: $('#btnSelector'),
        deleteFolderButton: $('#btnDeleteFolder'),
        renameFolderButton: $('#btnRenameFolder'),
        deleteFileButton: $('#btnDeleteFile'),
        renameFileButton: $('#btnRenameFile'),
        selectedFileInput: $("#fileSelection"),
        newFolderButton: $('#btnCreateFolder'),
        progressUI: $('#progress'),
        uploadTab: $('#tab2'),
        cropTab: $('#tab3'),
        treeData: [],
        selectedFileList: [],
        setPreview: function (url, name) {
            $("#filePreview").attr("src", url);
            $("#image").attr("src", url);
            $("#cropCurrentDir").val(url);
            $("#croppedFileName").val("crop-" + name);
            fileManager.uploadTab.hide();
            fileManager.cropTab.show();
            //fileManager.setupCropper();

        },
        clearPreview: function () {
            $("#filePreview").attr("src", fileManager.emptyPreviewUrl);
            $("#fileCropPreview").attr("src", fileManager.emptyPreviewUrl);
            $("#cropCurrentDir").val('');
            $("#croppedFileName").val('');
            fileManager.uploadTab.show();
            fileManager.cropTab.hide();
        },
        setCurrentDirectory: function (virtualPath) {
            $("#newFolderCurrentDir").val(virtualPath);
            $("#hdnCurrentVirtualPath").val(virtualPath);
            $("#uploadCurrentDir").val(virtualPath);
            $("#currentFolder").html(virtualPath);
            $("#folderToDelete").val(virtualPath);
            $("#folderToRename").val(virtualPath);
            if (fileManager.canDelete) {
                $('#frmDeleteFolder').show();
                $("#frmRenameFolder").show();
            }

        },
        clearCurrentDirectory: function () {
            $("#newFolderCurrentDir").val(fileManager.rootVirtualPath);
            $("#hdnCurrentVirtualPath").val(fileManager.rootVirtualPath);
            $("#uploadCurrentDir").val(fileManager.rootVirtualPath);
            $("#currentFolder").html(fileManager.rootVirtualPath);
            $("#folderToDelete").val('');
            $("#folderToRename").val('');
            $('#frmDeleteFolder').hide();
            $("#frmRenameFolder").hide();

        },
        setCurrentFile: function (virtualPath, fileName) {
            fileManager.selectedFileInput.val(virtualPath);
            $("#fileToRename").val(virtualPath);
            $("#fileToDelete").val(virtualPath);
            if (fileName) {
                $("#newFileNameSegment").val(fileName);
            }
            
            if (fileManager.canDelete) {
                $('#frmDeleteFile').show();
                $("#frmRenameFile").show();
            }

        },
        clearCurrentFile: function () {
            fileManager.selectedFileInput.val('');
            $("#fileToRename").val('');
            $("#fileToDelete").val('');
            $("#newFileNameSegment").val('');
            $('#frmDeleteFile').hide();
            $("#frmRenameFile").hide();
            fileManager.clearPreview();
            

        },
        notify: function (message, cssClass) {
            $('#alert_placeholder').html('<div class="alert ' + cssClass + '"><a class="close" data-dismiss="alert">×</a><span>' + message + '</span></div>')
        },
        addFileToList: function (data, fileList, index, file) {
            var d = $("<span class='fa fa-trash-o' aria-role='button' title='Remove'></span>").click(function () {
                data.files.splice(index, 1);
                fileList = data.files;
                $('#fileList li').eq(index).remove();
                if (fileList.length === 0) {
                    $('#fileList').html('');
                }
            });
            var item = $("<li>", { text: file.name }).append("&nbsp;").append(d);
            $('#fileList ul').append(item);
        },
        addErrorToList: function (index, file) {
            var item = $("<li>", { text: file.ErrorMessage });
            $('#fileList ul').append(item);
        },

        createFolder: function () {
            var formData = $('#frmNewFolder').serializeArray();
            //alert(JSON.stringify(formData));
            $.ajax({
                method: "POST",
                url: fileManager.createFolderApiUrl,
                data: formData
            }).done(function (data) {
                // alert(JSON.stringify(data));
                if (data.succeeded) {
                    var currentPath = $("#newFolderCurrentDir").val();
                    if (currentPath === fileManager.rootVirtualPath) {
                        fileManager.loadTree();
                    }
                    else {
                        fileManager.reloadSubTree();
                    }
                    
                    $("#newFolderName").val('');
                    //fileManager.notify('Folder created', 'alert-success');
                }
                else {
                    fileManager.notify(data.message, 'alert-danger');

                }

            })
            .fail(function () {
                fileManager.notify('An error occured', 'alert-danger');
            });

            return false; //cancel form submit
        },
        deleteFolder: function () {
            var currentPath = $("#folderToDelete").val();
            if (currentPath === fileManager.rootVirtualPath) {
                return false;
            }
            if (confirm("Are you sure you want to permanently delete the folder " + currentPath + " and any files or folders below it?")) {
                var formData = $('#frmDeleteFolder').serializeArray();
                //alert(JSON.stringify(formData));
                $.ajax({
                    method: "POST",
                    url: fileManager.deleteFolderApiUrl,
                    data: formData
                }).done(function (data) {
                    if (data.succeeded) {
                        fileManager.removeNode(currentPath);
                        fileManager.clearCurrentDirectory();
                        
                    }
                    else {
                        fileManager.notify(data.message, 'alert-danger');

                    }

                })
                .fail(function () {
                    fileManager.notify('An error occured', 'alert-danger');
                });
            }

            return false; //cancel form submit
        },
        renameFolder: function () {
            var currentPath = $("#folderToRename").val();
            if (currentPath === fileManager.rootVirtualPath) {
                return false;
            }
            if (confirm("Are you sure you want to rename the folder " + currentPath + "?")) {
                var formData = $('#frmRenameFolder').serializeArray();
                //alert(JSON.stringify(formData));
                $.ajax({
                    method: "POST",
                    url: fileManager.renameFolderApiUrl,
                    data: formData
                }).done(function (data) {
                    if (data.succeeded) {
                        var tree = $('#tree').treeview(true);
                        var matchingNodes = tree.findNodes(currentPath, 'id');
                        if (matchingNodes) {
                            var parents = tree.getParents(matchingNodes);
                            if (parents && parents.length > 0) {
                                fileManager.reloadSubTree(parents[0].id);
                            }

                        }

                        fileManager.clearCurrentDirectory();

                    }
                    else {
                        fileManager.notify(data.message, 'alert-danger');

                    }

                })
                .fail(function () {
                    fileManager.notify('An error occured', 'alert-danger');
                });
            }

            return false; //cancel form submit
        },
        deleteFile: function () {
            var currentPath = $("#fileToDelete").val();
            if (currentPath === '') {
                return false;
            }
            if (currentPath === fileManager.rootVirtualPath) {
                return false;
            }
            if (confirm("Are you sure you want to permanently delete the file " + currentPath + "?")) {
                var formData = $('#frmDeleteFile').serializeArray();
                //alert(JSON.stringify(formData));
                $.ajax({
                    method: "POST",
                    url: fileManager.deleteFileApiUrl,
                    data: formData
                }).done(function (data) {
                    if (data.succeeded) {
                        fileManager.removeNode(currentPath);
                        fileManager.clearCurrentFile();
                    }
                    else {
                        fileManager.notify(data.message, 'alert-danger');
                    }
                })
                .fail(function () {
                    fileManager.notify('An error occured', 'alert-danger');
                });
            }

            return false; //cancel form submit
        },
        renameFile: function () {
            var currentPath = $("#fileToRename").val();
            if (currentPath === '') {
                return false;
            }
            if (currentPath === fileManager.rootVirtualPath) {
                return false;
            }
            if (confirm("Are you sure you want to rename the file " + currentPath + "?")) {
                var formData = $('#frmRenameFile').serializeArray();
                //alert(JSON.stringify(formData));
                $.ajax({
                    method: "POST",
                    url: fileManager.renameFileApiUrl,
                    data: formData
                }).done(function (data) {
                    if (data.succeeded) {
                        var tree = $('#tree').treeview(true);
                        var matchingNodes = tree.findNodes(currentPath, 'id');
                        if (matchingNodes) {
                            var parents = tree.getParents(matchingNodes);
                            if (parents && parents.length > 0) {
                                fileManager.reloadSubTree(parents[0].id);
                            }

                        }

                        fileManager.clearCurrentFile();

                    }
                    else {
                        fileManager.notify(data.message, 'alert-danger');

                    }

                })
                .fail(function () {
                    fileManager.notify('An error occured', 'alert-danger');
                });
            }

            return false; //cancel form submit
        },
        ckReturnFile: function () {
            var funcNum = '@Model.CKEditorFuncNum';
            var fileUrl = fileManager.selectedFileInput.val();
            if (fileUrl.length === 0) {
                fileManager.notify('Please select a file in the browse tab', 'alert-danger');
            }
            else {
                window.opener.CKEDITOR.tools.callFunction(funcNum, fileUrl);
                window.close();
            }
        },
        removeNode: function (id) {
            var tree = $('#tree').treeview(true);
            var matchingNodes = tree.findNodes(id, 'id');
            tree.removeNode(matchingNodes, { silent: true });
        },
        reloadSubTree: function (folderIdToReload) {
            var tree = $('#tree').treeview(true);
            var currentFolderId = folderIdToReload || $("#uploadCurrentDir").val();
            //alert(currentFolderId);
            var matchingNodes = tree.findNodes(currentFolderId, 'id');
            if (matchingNodes.length > 0) {
                tree.collapseNode(matchingNodes, { silent: true, ignoreChildren: false });
                var theNode = matchingNodes[0];
                //alert(JSON.stringify(theNode));
                //alert(theNode.id)
                var newNode = {
                    text: theNode.text,
                    id: theNode.id,
                    type: theNode.type,
                    icon: theNode.icon,
                    expandedIcon: theNode.expandedIcon,
                    virtualPath: theNode.virtualPath,
                    nodes: [],
                    lazyLoad: true //this makes it load child nodes on expand
                };
                tree.updateNode(theNode, newNode, { silent: true });
                matchingNodes = tree.findNodes(currentFolderId, 'id');
                tree.expandNode(matchingNodes, { silent: true, ignoreChildren: false });

            }
            else {
                alert('node not found');
            }
        },
        loadTree: function () {
            $('#tree').treeview({
                dataUrl: {
                    method: 'GET',
                    dataType: 'json',
                    url: fileManager.treeDataApiUrl,
                    cache: false
                },
                nodeIcon: 'fa fa-folder',
                //selectedIcon: null,
                collapseIcon: 'fa fa-minus',
                emptyIcon: 'fa',
                expandIcon: 'fa fa-plus',
                loadingIcon: 'fa fa-hourglass-o',
                levels: 2,
                onhoverColor: '#F5F5F5',
                highlightSelected: true,
                showBorder: true,
                showCheckbox: false,
                showIcon: true,
                wrapNodeText: false,
                lazyLoad: function (node, dataFunc) {
                    //alert(node.text + ' lazyload');
                    $.ajax({
                        dataType: "json",
                        url: fileManager.treeDataApiUrl + '?virtualStartPath=' + node.virtualPath

                    })
                      .done(function (data) {
                          dataFunc(data);
                          
                      })
                    ;
                    node.lazyLoaded = true;

                },
                onNodeSelected: function (event, node) {
                    //alert(node.virtualPath + ' selected');
                    if (node.canPreview) {
                        fileManager.setPreview(node.virtualPath, node.text);   
                    }
                    else {
                        fileManager.clearPreview();    
                    }
                    if (node.type === "d") {
                        fileManager.setCurrentDirectory(node.virtualPath);
                        fileManager.clearCurrentFile();
                    }
                    else {
                        fileManager.clearCurrentDirectory();
                        fileManager.setCurrentFile(node.virtualPath, node.text);
                    }
                },
                onNodeUnselected: function (event, node) {
                    //alert(node.virtualPath + ' unselected');
                    //alert(node.state.selected);
                    // a hack because for some reason lazy load expand leads to unselected event
                    //alert(JSON.stringify(node));
                    if (node.lazyLoaded) {
                        node.lazyLoaded = false;
                    }
                    else {
                        fileManager.clearCurrentDirectory();
                    }
                    //
                },
                onNodeExpanded: function (event, node) {
                    //alert(node.virtualPath + ' expanded');
                    //if (node.type === "d") {
                    //    node.icon = "fa fa-folder-open-o";
                    //    node.selectedIcon = "fa fa-folder-open-o";
                    //   // alert('expanded');
                    //}
                    //var tree = $('#tree').treeview(true);
                    //tree.selectNode([node], { silent: true });
                },
                onNodeCollapsed: function (event, node) {
                    //if (node.type === "d") {
                    //    node.icon = "fa fa-folder-o";
                    //    node.selectedIcon = "fa fa-folder-o";
                    //}

                }
            });

        },
        setupFileLoader: function () {
            $('#pnlFiles').fileupload({
                fileInput: $('#fileupload'),
                url: fileManager.uploadApiUrl,
                dataType: 'json',
                autoUpload: false,
                singleFileUploads: false,
                limitMultiFileUploads: 10,
                limitConcurrentUploads: 10,
                dropZone: $('#dropZone'),
                pasteZone: $('#dropZone'),
                add: function (e, data) {
                    $('#fileList').html('');
                    $('#fileList').append($("<ul class='filelist'></ul>"));
                    var regx = allowedFilesRegex;
                    var j = 0;
                    var k = data.files.length;
                    //alert(k);
                    while (j < k) {
                        if ((regx.test(data.files[j].name)) === false) {
                            //alert('false');
                            data.files.splice(j, 1);
                            k = data.files.length;
                            j = -1;
                        }
                        j++;
                    }
                    fileManager.selectedFileList = fileManager.selectedFileList.concat(data.files);
                    var maxAllowed = 10;
                    while (fileManager.selectedFileList.length > maxAllowed) {
                        fileManager.selectedFileList.pop();
                    }
                    data.files = fileManager.selectedFileList;
                    if (data.files.length > 0) {
                        var btnSend = $("<button id='btnSend' class='btn btn-success'><i class='fa fa-cloud-upload' aria-hidden='true'></i> Upload</button>");
                        btnSend.appendTo($('#fileList'));
                    }
                    $.each(data.files, function (index, file) { fileManager.addFileToList(data, fileManager.selectedFileList, index, file); });
                    $('#btnSend').click(function () {
                        data.context = $('<p/>').text('Uploading...').replaceAll($(this));
                        data.submit();
                    });
                },
                done: function (e, data) {
                    $('#progress').hide();
                    $('#fileList').html('');
                    fileListuploader = [];
                    $('#fileList').append($("<ul class='filelist file-errors'></ul>"));
                    var j = 0;
                    var errorsOccurred = false;
                    while (j < data.length) {
                        if (data[j].errorMessage) {
                            errorsOccurred = true;
                            addErrorToList(j, data[j]);
                        }
                        j++;
                    }

                    fileManager.reloadSubTree();
                },
                progressall: function (e, data) {
                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    fileManager.progressUI.show();
                    $('#progress .progress-bar').css(
                        'width',
                        progress + '%'
                    );
                }

            }).prop('disabled', !$.support.fileInput)
              .parent().addClass($.support.fileInput ? undefined : 'disabled');

            $('#fileupload').bind('fileuploadsubmit', function (e, data) {
                data.formData = $('#frmUpload').serializeArray();
                //alert(data.formData);
                return true;
            });

        },
        
        init: function () {
            $(document).bind('drop dragover', function (e) { e.preventDefault(); });
            this.progressUI.hide();
            this.cropTab.hide();
            this.loadTree();
            this.setupFileLoader();
            this.newFolderButton.on('click', fileManager.createFolder);
            this.fileSelectorButton.on('click', fileManager.ckReturnFile);
            this.deleteFolderButton.on('click', fileManager.deleteFolder);
            this.renameFolderButton.on('click', fileManager.renameFolder);
            this.deleteFileButton.on('click', fileManager.deleteFile);
            this.renameFileButton.on('click', fileManager.renameFile);


        }


    };

    fileManager.init();

    var cropManager = {
        setup: function () {
            var console = window.console || { log: function () { } };
            var URL = window.URL || window.webkitURL;
            var $image = $('#image');
            var $download = $('#download');
            var $dataX = $('#dataX');
            var $dataY = $('#dataY');
            var $dataHeight = $('#dataHeight');
            var $dataWidth = $('#dataWidth');
            var $dataRotate = $('#dataRotate');
            var $dataScaleX = $('#dataScaleX');
            var $dataScaleY = $('#dataScaleY');
            var options = {
                aspectRatio: 16 / 9,
                preview: '.img-preview',
                crop: function (e) {
                    $dataX.val(Math.round(e.x));
                    $dataY.val(Math.round(e.y));
                    $dataHeight.val(Math.round(e.height));
                    $dataWidth.val(Math.round(e.width));
                    $dataRotate.val(e.rotate);
                    $dataScaleX.val(e.scaleX);
                    $dataScaleY.val(e.scaleY);
                }
            };
            var originalImageURL = $image.attr('src');
            var uploadedImageURL;


            // Tooltip
            $('[data-toggle="tooltip"]').tooltip();


            // Cropper
            $image.on({
                ready: function (e) {
                    console.log(e.type);
                },
                cropstart: function (e) {
                    console.log(e.type, e.action);
                },
                cropmove: function (e) {
                    console.log(e.type, e.action);
                },
                cropend: function (e) {
                    console.log(e.type, e.action);
                },
                crop: function (e) {
                    console.log(e.type, e.x, e.y, e.width, e.height, e.rotate, e.scaleX, e.scaleY);
                },
                zoom: function (e) {
                    console.log(e.type, e.ratio);
                }
            }).cropper(options);


            // Buttons
            if (!$.isFunction(document.createElement('canvas').getContext)) {
                $('button[data-method="getCroppedCanvas"]').prop('disabled', true);
            }

            if (typeof document.createElement('cropper').style.transition === 'undefined') {
                $('button[data-method="rotate"]').prop('disabled', true);
                $('button[data-method="scale"]').prop('disabled', true);
            }


            // Download
            if (typeof $download[0].download === 'undefined') {
                $download.addClass('disabled');
            }


            // Options
            $('.docs-toggles').on('change', 'input', function () {
                var $this = $(this);
                var name = $this.attr('name');
                var type = $this.prop('type');
                var cropBoxData;
                var canvasData;

                if (!$image.data('cropper')) {
                    return;
                }

                if (type === 'checkbox') {
                    options[name] = $this.prop('checked');
                    cropBoxData = $image.cropper('getCropBoxData');
                    canvasData = $image.cropper('getCanvasData');

                    options.ready = function () {
                        $image.cropper('setCropBoxData', cropBoxData);
                        $image.cropper('setCanvasData', canvasData);
                    };
                } else if (type === 'radio') {
                    options[name] = $this.val();
                }

                $image.cropper('destroy').cropper(options);
            });


            // Methods
            //uploadCroppedImage
            $("#btnUploadCropped").on('click', cropManager.uploadCroppedImage);

            $('.docs-buttons').on('click', '[data-method]', function () {
                var $this = $(this);
                var data = $this.data();
                var $target;
                var result;

                if ($this.prop('disabled') || $this.hasClass('disabled')) {
                    return;
                }

                if ($image.data('cropper') && data.method) {
                    data = $.extend({}, data); // Clone a new one

                    if (typeof data.target !== 'undefined') {
                        $target = $(data.target);

                        if (typeof data.option === 'undefined') {
                            try {
                                data.option = JSON.parse($target.val());
                            } catch (e) {
                                console.log(e.message);
                            }
                        }
                    }

                    if (data.method === 'rotate') {
                        $image.cropper('clear');
                    }

                    result = $image.cropper(data.method, data.option, data.secondOption);

                    if (data.method === 'rotate') {
                        $image.cropper('crop');
                    }

                    switch (data.method) {
                        case 'scaleX':
                        case 'scaleY':
                            $(this).data('option', -data.option);
                            break;

                        case 'getCroppedCanvas':
                            if (result) {

                                // Bootstrap's Modal
                                $('#getCroppedCanvasModal').modal().find('.modal-body').html(result);

                                if (!$download.hasClass('disabled')) {
                                    $download.attr('href', result.toDataURL('image/jpeg'));
                                }
                            }

                            break;

                        case 'destroy':
                            if (uploadedImageURL) {
                                URL.revokeObjectURL(uploadedImageURL);
                                uploadedImageURL = '';
                                $image.attr('src', originalImageURL);
                            }

                            break;
                    }

                    if ($.isPlainObject(result) && $target) {
                        try {
                            $target.val(JSON.stringify(result));
                        } catch (e) {
                            console.log(e.message);
                        }
                    }

                }

            });


            // Keyboard
            $(document.body).on('keydown', function (e) {

                if (!$image.data('cropper') || this.scrollTop > 300) {
                    return;
                }

                switch (e.which) {
                    case 37:
                        e.preventDefault();
                        $image.cropper('move', -1, 0);
                        break;

                    case 38:
                        e.preventDefault();
                        $image.cropper('move', 0, -1);
                        break;

                    case 39:
                        e.preventDefault();
                        $image.cropper('move', 1, 0);
                        break;

                    case 40:
                        e.preventDefault();
                        $image.cropper('move', 0, 1);
                        break;
                }

            });


            // Import image
            var $inputImage = $('#inputImage');

            if (URL) {
                $inputImage.change(function () {
                    var files = this.files;
                    var file;

                    if (!$image.data('cropper')) {
                        return;
                    }

                    if (files && files.length) {
                        file = files[0];

                        if (/^image\/\w+$/.test(file.type)) {
                            if (uploadedImageURL) {
                                URL.revokeObjectURL(uploadedImageURL);
                            }

                            uploadedImageURL = URL.createObjectURL(file);
                            $image.cropper('destroy').attr('src', uploadedImageURL).cropper(options);
                            $inputImage.val('');
                        } else {
                            window.alert('Please choose an image file.');
                        }
                    }
                });
            } else {
                $inputImage.prop('disabled', true).parent().addClass('disabled');
            }
        },
        tearDown: function () {
            if (($('#image').data('cropper'))) {
                $('#image').cropper('destroy');
            }
        },
        uploadCroppedImage: function () {

            $('#image').cropper('getCroppedCanvas').toBlob(function (blob) {

                var formData = new FormData($('#frmUploadCropped'));
                formData.append($("#croppedFileName").val(), blob);
                //alert(JSON.stringify(formData));
                $.ajax({
                    method: "POST",
                    url: fileManager.uploadApiUrl,
                    data: formData,
                    processData: false,
                    contentType:false
                }).done(function (data) {
                    // alert(JSON.stringify(data));
                    if (data.succeeded) {
                        var currentPath = $("#newFolderCurrentDir").val();
                        if (currentPath === fileManager.rootVirtualPath) {
                            fileManager.loadTree();
                        }
                        else {
                            fileManager.reloadSubTree();
                        }

                        $("#newFolderName").val('');
                        //fileManager.notify('Folder created', 'alert-success');
                    }
                    else {
                        fileManager.notify(data.message, 'alert-danger');

                    }

                })
                .fail(function () {
                    fileManager.notify('An error occured', 'alert-danger');
                });

            });

            

            return false; //cancel form submit
        }
    };

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        var target = $(e.target).attr("href") // activated tab

        if (target === "#tabCrop") {
            cropManager.setup();
        }
        else {
            var related = $(e.relatedTarget).attr("href"); //previous tab
            var hash = related.replace(/^.*?(#|$)/, '');
            //alert(hash);
            if (hash === "tabCrop") {
                cropManager.tearDown();
            }
        }
    });

})();
