/*!
 * Bootstrap4 wyswyg 1.0
 * By leefine chan
 */
(function (window, $) {
    "use strict";

    function Wysiwyg(element, userOptions) {
        this.selectedRange = null;
        this.editor = $(element);
        var editor = $(element);
        var defaults = {
            toolbarSelector: "[data-role=editor-toolbar]",
            commandRole: "edit",
            activeToolbarClass: "active",
            selectionMarker: "edit-focus-marker",
            selectionColor: "blue",
            dragAndDropImages: true,
            upload_img_type: 'bmp|gif|jpg|jpeg|png',
            upload_doc_type: 'doc|docx|xls|xlsx|ppt|pptx|ppsx|pdf|zip',
            upload_video_type: 'mp4',
            upload_file_max_size_m: 10,
            fileUploadError: function (reason, detail) {
                console.log("File upload error", reason, detail);
            }
        };

        var options = $.extend(true, {}, defaults, userOptions);
        var toolbarBtnSelector = "a[data-" + options.commandRole + "],button[data-" + options.commandRole + "],input[type=button][data-" + options.commandRole + "]";
        var toolbar = $(options.toolbarSelector);

        this.bindToolbar(editor, toolbar, options, toolbarBtnSelector);

        if (options.dragAndDropImages) {
            this.initFileDrops(editor, toolbar, options, toolbarBtnSelector);
        }

        editor.attr({"contenteditable": true, "designMode": 'On'})
            .on("mouseup mouseout keyup", function () {
                this.saveSelection();
                this.updateToolbar(editor, toolbarBtnSelector, options);
            }.bind(this))
            .on('keydown', function (e) {
                if (e.keyCode === 13) {
                    document.execCommand('insertHTML', false, '<br/><br/>');
                    return false;
                }
            }.bind(this));
    }

    Wysiwyg.prototype.readFileIntoDataUrl = function (fileInfo) {
        var loader = $.Deferred(),
            fReader = new FileReader();

        fReader.onload = function (e) {
            loader.resolve(e.target.result);
        };

        fReader.onerror = loader.reject;
        fReader.onprogress = loader.notify;
        fReader.readAsDataURL(fileInfo);
        return loader.promise();
    };

    Wysiwyg.prototype.updateToolbar = function (editor, toolbarBtnSelector, options) {
        if (options.activeToolbarClass) {
            $(options.toolbarSelector).find(toolbarBtnSelector).each(function () {
                var self = $(this);
                var commandArr = self.data(options.commandRole).split(" ");
                var command = commandArr[0];

                // If the command has an argument and its value matches this button. == used for string/number comparison
                if (commandArr.length > 1 && document.queryCommandEnabled(command) && document.queryCommandValue(command) === commandArr[1]) {
                    self.addClass(options.activeToolbarClass);
                }

                // Else if the command has no arguments and it is active
                else if (commandArr.length === 1 && document.queryCommandEnabled(command) && document.queryCommandState(command)) {
                    self.addClass(options.activeToolbarClass);
                }

                // Else the command is not active
                else {
                    self.removeClass(options.activeToolbarClass);
                }
            });
        }
    };

    Wysiwyg.prototype.execCommand = function (commandWithArgs, valueArg, editor, options, toolbarBtnSelector) {
        if (commandWithArgs == null || commandWithArgs == '')return;
        var commandArr = commandWithArgs.split(" "), command = commandArr.shift(),
            args = commandArr.join(" ") + ( valueArg || "" );

        //var parts = commandWithArgs.split("-");
        //if (parts.length === 1) {
        document.execCommand(command, false, args);
        /*} else if (parts[0] === "format" && parts.length === 2) {
         document.execCommand("formatBlock", false, parts[1]);
         }*/
        ( editor ).trigger("change");
        this.updateToolbar(editor, toolbarBtnSelector, options);
    };

    Wysiwyg.prototype.getCurrentRange = function () {
        var sel, range;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
            }
        } else if (document.selection) {
            range = document.selection.createRange();
        }

        return range;
    };

    Wysiwyg.prototype.saveSelection = function () {
        this.selectedRange = this.getCurrentRange();
    };

    Wysiwyg.prototype.restoreSelection = function () {
        var selection;
        if (window.getSelection || document.createRange) {
            selection = window.getSelection();
            if (this.selectedRange) {
                try {
                    selection.removeAllRanges();
                }
                catch (ex) {
                    document.body.createTextRange().select();
                    document.selection.empty();
                }
                selection.addRange(this.selectedRange);
            }
        } else if (document.selection && this.selectedRange) {
            this.selectedRange.select();
        }
    };

    Wysiwyg.prototype.insertFiles = function (files, fileInputName, options, editor, toolbar, toolbarBtnSelector, fileSelector) {
        var self = this;
        var imgReg = new RegExp(options.upload_img_type);
        var docReg = new RegExp(options.upload_doc_type);
        var videoReg = new RegExp(options.upload_video_type);
        var checkFile = true;
        $.each(files, function (idx, fileInfo) {
                if (fileInfo.size > (options.upload_file_max_size_m * 1024 * 1024)) {
                    $.fn_ex.alert(fileInfo.name + ' is too big,max size is ' + options.upload_file_max_size_m + 'M');
                    return;
                }
                var eMsg = "";
                if (fileInputName == 'insertImage') {
                    if (!(/^image\//.test(fileInfo.type) && imgReg.test(fileInfo.name.toLowerCase()))) {
                        eMsg = options.upload_img_type;
                        $.fn_ex.alert('Unsupported file type! Please upload type:' + eMsg);
                        checkFile = false;
                        return false;
                    }
                }
                if (fileInputName == 'insertFile') {
                    if (!(/^application\//.test(fileInfo.type) && docReg.test(fileInfo.name.toLowerCase()))) {
                        eMsg = options.upload_doc_type;
                        $.fn_ex.alert('Unsupported file type! Please upload type:' + eMsg);
                        checkFile = false;
                        return false;
                    }
                }
                if (fileInputName == 'insertVideo') {
                    if (!(/^video\//.test(fileInfo.type) && videoReg.test(fileInfo.name.toLowerCase()))) {
                        eMsg = options.upload_video_type;
                        $.fn_ex.alert('Unsupported file type! Please upload type:' + eMsg);
                        checkFile = false;
                        return false;
                    }
                }
            }
        );
        if (!checkFile)return;

        if (fileInputName == 'insertFile' && fileSelector !== undefined) {//大文件通过按钮上传
            // input:file value不可以动态赋值，如何处理？？？
            // $(editor).after("<input value='" + $(fileSelector).val() + "' type='file' name='" + fileInfo.name + "'/>");
            //移动选中的file并从新复制一个file到选择框
            var uuid = $.fn_ex.guid()
            if (files.length > 1) {
                $(editor).after(fileSelector);
                $('#attachFileBtn' + $(editor).attr("id")).prepend($(fileSelector).clone());
                $(fileSelector).removeAttr('data-role data-edit data-target');
                $(fileSelector).attr("name", uuid);
                $.each(files, function (idx, fileInfo) {
                    var mimeType = fileInfo.name.substring(fileInfo.name.lastIndexOf("."), fileInfo.name.length);
                    document.execCommand("insertHTML", false, '<a href="' + options.upload_file_dir + uuid + '_' + idx + mimeType + '" class="icon-file text-danger">' + fileInfo.name + '</a><br/><br/>');
                });
            } else {
                var mimeType = files[0].name.substring(files[0].name.lastIndexOf("."), files[0].name.length);
                $(editor).after(fileSelector);
                $('#attachFileBtn' + $(editor).attr("id")).prepend($(fileSelector).clone());
                $(fileSelector).removeAttr('data-role data-edit data-target');
                $(fileSelector).attr("name", uuid);
                document.execCommand("insertHTML", false, '<a href="' + options.upload_file_dir + uuid + mimeType + '" class="icon-file text-danger">' + files[0].name + '</a><br/><br/>');
            }
            self.bindFileSelect(editor, toolbar, options, toolbarBtnSelector)
        }
        else if (fileInputName == 'insertVideo' && fileSelector !== undefined) {//大视频文件通过按钮上传
            // input:file value不可以动态赋值，如何处理？？？
            // $(editor).after("<input value='" + $(fileSelector).val() + "' type='file' name='" + fileInfo.name + "'/>");
            //移动选中的file并从新复制一个file到选择框
            var uuid = $.fn_ex.guid();
            if (files.length > 1) {
                $(editor).after(fileSelector);
                $('#attachVideoBtn' + $(editor).attr("id")).prepend($(fileSelector).clone());
                $(fileSelector).removeAttr('data-role data-edit data-target');
                $(fileSelector).attr("name", uuid);
                $.each(files, function (idx, fileInfo) {
                    var mimeType = fileInfo.name.substring(fileInfo.name.lastIndexOf("."), fileInfo.name.length);
                    document.execCommand("insertHTML", false, '<video src="' + options.upload_file_dir + uuid + '_' + idx + mimeType + '" controls></video><br/><br/>');
                });
            } else {
                var mimeType = files[0].name.substring(files[0].name.lastIndexOf("."), files[0].name.length);
                $(editor).after(fileSelector);
                $('#attachVideoBtn' + $(editor).attr("id")).prepend($(fileSelector).clone());
                $(fileSelector).removeAttr('data-role data-edit data-target');
                $(fileSelector).attr("name", uuid);
                document.execCommand("insertHTML", false, '<video src="' + options.upload_file_dir + uuid + mimeType + '" controls></video><br/><br/>');
            }
            self.bindFileSelect(editor, toolbar, options, toolbarBtnSelector)
        }
        else {//文件视频拖动不能大于2M （保证速度）， 图片上传及拖动
            $.each(files, function (idx, fileInfo) {
                if (fileInfo.size > (2 * 1024 * 1024) && fileInputName == 'drag') {
                    $.fn_ex.alert('The file you draging cant be bigger than 2M!');
                    return false;
                }
                if (/^application\//.test(fileInfo.type) && docReg.test(fileInfo.name.toLowerCase())) {
                    $.when(self.readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
                        var uuid = $.fn_ex.guid();
                        var fileName = options.upload_file_dir + uuid + fileInfo.name.substring(fileInfo.name.lastIndexOf("."), fileInfo.name.length);
                        document.execCommand("insertHTML", false, '<a href="' + fileName + '" class="icon-file text-danger">' + fileInfo.name + '</a><br/><br/>');
                        $(editor).after("<input value='" + uuid + "~" + dataUrl + "' type='hidden' name='post_file'/>");
                    }).fail(function (e) {
                        $.fn_ex.alert('Read file failed');
                        options.fileUploadError("file-reader", e);
                    });
                }
                if (/^image\//.test(fileInfo.type) && imgReg.test(fileInfo.name.toLowerCase())) {
                    $.when(self.readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
                        self.execCommand("insertimage", dataUrl, editor, options, toolbarBtnSelector);
                        editor.trigger("image-inserted");
                    }).fail(function (e) {
                        $.fn_ex.alert('Read file failed');
                        options.fileUploadError("file-reader", e);
                    });
                }
                if (/^video\//.test(fileInfo.type) && videoReg.test(fileInfo.name.toLowerCase())) {
                    $.when(self.readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
                        document.execCommand("insertHTML", false, '<video src="' + dataUrl + '" controls></video><br/><br/>');
                    }).fail(function (e) {
                        $.fn_ex.alert('Read file failed');
                        options.fileUploadError("file-reader", e);
                    });
                }
            });
        }
    };

    Wysiwyg.prototype.markSelection = function (color, options) {
        this.restoreSelection();
        if (document.queryCommandSupported("hiliteColor")) {
            document.execCommand("hiliteColor", false, color || "transparent");
        }
        this.saveSelection();
    };

//Move selection to a particular element
    function selectElementContents(element) {
        if (window.getSelection && document.createRange) {
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (document.selection && document.body.createTextRange) {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(element);
            textRange.select();
        }
    }

    Wysiwyg.prototype.bindToolbar = function (editor, toolbar, options, toolbarBtnSelector) {
        var self = this;
        toolbar.find(toolbarBtnSelector).click(function () {
            self.restoreSelection();
            editor.focus();

            if ($(this).data(options.commandRole) == "html") {
                self.toggleHtmlEdit(editor);
            } else {
                self.execCommand($(this).data(options.commandRole), null, editor, options, toolbarBtnSelector);
            }
            self.saveSelection();
        });

        toolbar.find("[data-toggle=dropdown]").on('click', (function () {
            self.markSelection(options.selectionColor, options);
        }));

        toolbar.on("hide.bs.dropdown", function () {
            self.markSelection(false, options);
        });

        toolbar.find("input[type=text][data-" + options.commandRole + "]").on("webkitspeechchange change", function () {
            var newValue = $(this).val();  // Ugly but prevents fake double-calls due to selection restoration
            $(this).val('');//.value = "";
            self.restoreSelection();

            var text = window.getSelection();
            if (text.toString().trim() === '' && newValue) {
                //create selection if there is no selection
                self.editor.append('<span>' + newValue + '</span>');
                selectElementContents($('span:last', self.editor)[0]);
            }

            if (newValue) {
                editor.focus();
                self.execCommand($(this).data(options.commandRole), newValue, editor, options, toolbarBtnSelector);
            }
            self.saveSelection();
        }).on("blur", function () {
            var input = $(this);
            self.markSelection(false, options);
        });
        toolbar.find(".colorSelector").on("click", function () {
            var cmdBtn = $(this).data(options.commandRole);
            self.restoreSelection();
            if (cmdBtn == ('hiliteColor') || cmdBtn == 'backColor') {
                document.execCommand(cmdBtn, false, $(this).attr('data-color'));
                return;
            }
            else if (cmdBtn == 'foreColor') {
                document.execCommand(cmdBtn, false, $(this).attr('data-color'));
                self.saveSelection();
            }
            else {
                return;
            }
        }).on("blur", function () {
            var input = $(this);
            self.markSelection(false, options);
        });
        self.bindFileSelect(editor, toolbar, options, toolbarBtnSelector);
    };

    Wysiwyg.prototype.bindFileSelect = function (editor, toolbar, options, toolbarBtnSelector) {
        var self = this;
        toolbar.find("input[type=file][data-" + options.commandRole + "]").change(function () {
            self.restoreSelection();
            if (this.type === "file" && this.files && this.files.length > 0) {
                self.insertFiles(this.files, $(this).attr("data-" + options.commandRole), options, editor, toolbar, toolbarBtnSelector, this);
            }
            self.saveSelection();
        });
    };

    Wysiwyg.prototype.initFileDrops = function (editor, toolbar, options, toolbarBtnSelector) {
        var self = this;
        editor.on("dragenter dragover", false).on("drop", function (e) {
            var dataTransfer = e.originalEvent.dataTransfer;
            e.stopPropagation();
            e.preventDefault();
            if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
                self.insertFiles(dataTransfer.files, 'drag', options, editor, toolbar, toolbarBtnSelector);
            }
        });
    };

    /*
     *  Represenets an editor
     *  @constructor
     *  @param {object} userOptions - The default options selected by the user.
     */
    $.fn.wysiwyg = function (userOptions) {
        var wysiwyg = new Wysiwyg(this, userOptions);
    };

    /*    $.fn.wysiwyg.getHtml = function (container, options) {
     if (options.base64_to_file !== undefined && options.base64_to_file == true) {
     var gGal = $.parseHTML('<div>' + $(container).html() + '</div>');
     if ($(gGal).has("img").length) {
     var gImages = $("img", $(gGal));
     $.each(gImages, function (i, v) {
     if ($(v).attr("src").match(/^data:image\/.*$/)) {
     var uuid = $.fn.wysiwyg.guid();
     $(container).after("<input value='" + uuid + "~" + $(v).attr("src") + "' type='hidden' name='post_img'/>");
     var picName = uuid + '.' + $(v).attr("src").substring($(v).attr("src").indexOf("/") + 1, $(v).attr("src").indexOf(";"));//后缀名
     $(v).attr("src", options.upload_img_dir + picName);
     }
     });
     }
     if ($(gGal).has("video").length) {
     var gImages = $("video", $(gGal));
     $.each(gImages, function (i, v) {
     if ($(v).attr("src").match(/^data:video\/.*$/)) {
     var uuid = $.fn.wysiwyg.guid();
     $(container).after("<input value='" + uuid + "~" + $(v).attr("src") + "' type='hidden' name='post_file'/>");
     var videoName = uuid + '.' + $(v).attr("src").substring($(v).attr("src").indexOf("/") + 1, $(v).attr("src").indexOf(";"));//后缀名
     $(v).attr("src", options.upload_file_dir + videoName);
     }
     });
     }
     return $(gGal).html();
     }
     else {
     return $(container).html();
     }
     };*/

    $.fn.getWysiwygHtml = function (options) {
        var container = this;
        if (options.base64_to_file !== undefined && options.base64_to_file == true) {
            var gGal = $.parseHTML('<div>' + $(container).html() + '</div>');
            if ($(gGal).has("img").length) {
                var gImages = $("img", $(gGal));
                $.each(gImages, function (i, v) {
                    if ($(v).attr("src").match(/^data:image\/.*$/)) {
                        var uuid = $.fn_ex.guid();
                        $(container).after("<input value='" + uuid + "~" + $(v).attr("src") + "' type='hidden' name='post_img'/>");
                        var picName = uuid + '.' + $(v).attr("src").substring($(v).attr("src").indexOf("/") + 1, $(v).attr("src").indexOf(";"));//后缀名
                        $(v).attr("src", options.upload_img_dir + picName);
                    }
                });
            }
            if ($(gGal).has("video").length) {
                var gImages = $("video", $(gGal));
                $.each(gImages, function (i, v) {
                    if ($(v).attr("src").match(/^data:video\/.*$/)) {
                        var uuid = $.fn_ex.guid();
                        $(container).after("<input value='" + uuid + "~" + $(v).attr("src") + "' type='hidden' name='post_file'/>");
                        var videoName = uuid + '.' + $(v).attr("src").substring($(v).attr("src").indexOf("/") + 1, $(v).attr("src").indexOf(";"));//后缀名
                        $(v).attr("src", options.upload_file_dir + videoName);
                    }
                });
            }
            return $(gGal).html();
        }
        else {
            return $(container).html();
        }
    };

    /***
     * 初始化编辑器
     * @param ifImgConvert 是否转换Base64图片
     */
    $.fn.initWysiwyg = function (userOptions) {
        if (userOptions.editor_height === undefined) userOptions.editor_height = "300";
        if (userOptions.upload_file_dir === undefined || userOptions.upload_img_dir === undefined) {
            alert("userOptions.upload_file_dir or userOptions.upload_img_dir can't be empty!");
            return;
        }

        var getColors = function (t) {
            var clr = new Array('00', '50', 'A0', 'FF'),
                colorsSelector = "";
            for (i = 0; i < 4; i++) {
                for (j = 0; j < 4; j++) {
                    for (k = 0; k < 4; k++) {
                        colorsSelector += "<div class='colorSelector' data-edit='" + t + "' data-color='#" + clr[3 - i] + clr[3 - j] + clr[3 - k] + "' style='background-color: #" + clr[3 - i] + clr[3 - j] + clr[3 - k] + "'></div>";
                    }
                }
            }
            return colorsSelector;
        };

        var editorID = $(this).attr("id") + "Editor", thisInput = $(this);
        var toolBar = [
            {
                "btns": [
                    {"ico": "&#xf0ad9", "title": "Undo", "dataedit": "undo"},
                    {"ico": "&#xf0af0", "title": "Redo", "dataedit": "redo"}
                ]
            },
            {
                "btns": [
                    {"ico": "&#xf089b", "title": "Bold", "dataedit": "bold"},
                    {"ico": "&#xf089c", "title": "Italic", "dataedit": "italic"},
                    {"ico": "&#xf0735", "title": "Strikethrough", "dataedit": "strikethrough"},
                    {"ico": "&#xf0bb8", "title": "Underline", "dataedit": "underline"},
                    {"ico": "&#xf0809", "title": "Horizontal", "dataedit": "insertHorizontalRule"}
                ]
            },
            {
                "dmenu": {
                    "ico": "&#xf072c;", "title": "Font",
                    "dropdownMenu": [
                        {"dataedit": "fontName Serif", "style": "display: block;font-family:'Serif'", "tit": "Serif"},
                        {"dataedit": "fontName Arial", "style": "display: block;font-family:'Arial'", "tit": "Arial"},
                        {
                            "dataedit": "fontName Impact",
                            "style": "display: block;font-family:'Impact'",
                            "tit": "Impact"
                        },
                        {
                            "dataedit": "fontName Arial Black",
                            "style": "display: block;font-family:'Arial Black'",
                            "tit": "Arial Black"
                        },
                        {
                            "dataedit": "fontName Helvetica",
                            "style": "display: block;font-family:'Helvetica'",
                            "tit": "Helvetica"
                        },
                        {
                            "dataedit": "fontName Sans-serif",
                            "style": "display: block;font-family:'Sans-serif'",
                            "tit": "Sans-serif"
                        },
                        {
                            "dataedit": "fontName verdana",
                            "style": "display: block;font-family:'verdana'",
                            "tit": "verdana"
                        }
                    ]
                }
            },
            {
                "strHtml": '<a class="btn btn-outline-info dropdown-toggle" data-toggle="dropdown" title="Fore Color"><i data-icon="&#xf089a" class="text-success"></i></a><div class="dropdown-menu dropdown-menu-right" style="width: 200px;">' + getColors('foreColor') + '</div>'
            },
            {
                "strHtml": '<a class="btn btn-outline-info dropdown-toggle bg-success" data-toggle="dropdown" title="Back Color"><i data-icon="&#xf089a"></i></a><div class="dropdown-menu dropdown-menu-right" style="width: 200px;">' + getColors('hiliteColor') + '</div>'
            },
            {
                "dmenu": {
                    "ico": "&#xf0731;", "title": "Font Size",
                    "dropdownMenu": [
                        {"dataedit": "fontSize 3", "style": "display: block", "tit": "<font size=\"3\">size 3</font>"},
                        {"dataedit": "fontSize 4", "style": "display: block", "tit": "<font size=\"4\">size 4</font>"},
                        {"dataedit": "fontSize 5", "style": "display: block", "tit": "<font size=\"5\">size 5</font>"},
                        {"dataedit": "fontSize 6", "style": "display: block", "tit": "<font size=\"6\">size 6</font>"},
                        {"dataedit": "fontSize 7", "style": "display: block", "tit": "<font size=\"7\">size 7</font>"}
                    ]
                }
            },
            {
                "dmenu": {
                    "ico": "H1", "title": "Heading",
                    "dropdownMenu": [
                        {"dataedit": "formatBlock p", "style": "display: block", "tit": "<h1>P</h1>"},
                        {"dataedit": "formatBlock h1", "style": "display: block", "tit": "<h1>h1</h1>"},
                        {"dataedit": "formatBlock h2", "style": "display: block", "tit": "<h2>h2</h2>"},
                        {"dataedit": "formatBlock h3", "style": "display: block", "tit": "<h3>h3</h3>"},
                        {"dataedit": "formatBlock h4", "style": "display: block", "tit": "<h4>h4</h4>"},
                        {"dataedit": "formatBlock h5", "style": "display: block", "tit": "<h5>h5</h5>"}
                    ]
                }
            },
            {
                "btns": [
                    {"ico": "&#xf081d", "title": "Bullet list", "dataedit": "insertunorderedlist"},
                    {"ico": "&#xf081c", "title": "Number list", "dataedit": "insertorderedlist"},
                    {"ico": "&#xf074c", "title": "Reduce indent", "dataedit": "outdent"},
                    {"ico": "&#xf074b", "title": "Indent", "dataedit": "indent"}
                ]
            },
            {
                "btns": [
                    {"ico": "&#xf0747", "title": "Align Left", "dataedit": "justifyleft"},
                    {"ico": "&#xf0748", "title": "Center", "dataedit": "justifycenter"},
                    {"ico": "&#xf0749", "title": "Align Right", "dataedit": "justifyright"},
                    {"ico": "&#xf074a", "title": "Justify", "dataedit": "justifyfull"}
                ]
            },
            {
                "btns": [
                    {"ico": "&#xf04df", "title": "RemoveFormat", "dataedit": "removeFormat"},
                    {"ico": "&#xf0973", "title": "Remove Hyperlink", "dataedit": "unlink"}
                ]
            },
            {
                "strHtml": '<a class="btn btn-outline-info dropdown-toggle" data-toggle="dropdown" title="Hyperlink"><i data-icon="&#xf0d2d"></i></a><div class="dropdown-menu dropdown-menu-right" style="width: 300px;"><div class="input-group p-xl-2"> <input placeholder="URL" type="text" data-edit="createLink" class="form-control"/><div class="input-group-append"> <button class="btn-info" type="button">Add</button></div> </div></div>'
            },
            {
                "strHtml": '<a class="btn btn-outline-info" title="Insert Table" id="insertTable' + editorID + '"><i data-icon="&#xf0740"></i></a>'
            },
            {
                "strHtml": '<span class="btn btn-outline-info" title="Insert picture (or just drag & drop)" id="pictureBtn' + editorID + '"><input style="z-index:10;width: 2rem;height:2rem;position: absolute;left: 0px;top: 0px; overflow: hidden;font-size: 100px;filter: alpha(opacity=0);opacity: 0;" type="file"  accept="image/*" data-role="magic-overlay" multiple="multiple" data-target="#pictureBtn' + editorID + '" data-edit="insertImage"/><i data-icon="&#xf0a80" style="z-index: 10"></i></span>'
            },
            {
                "strHtml": '<span class="btn btn-outline-info" title="Attach file (or just drag & drop)" id="attachFileBtn' + editorID + '"><input style="z-index:10;width: 2rem;height:2rem;position: absolute;left: 0px;top: 0px; overflow: hidden;font-size: 100px;filter: alpha(opacity=0);opacity: 0;" type="file" data-role="magic-overlay" multiple="multiple"  data-target="#attachFileBtn' + editorID + '" data-edit="insertFile"/><i data-icon="&#xf00c0" style="z-index: 10"></i></span>'
            },
            {
                "strHtml": '<span class="btn btn-outline-info" title="Attach video (or just drag & drop)" id="attachVideoBtn' + editorID + '"><input style="z-index:10;width: 2rem;height:2rem;position: absolute;left: 0px;top: 0px; overflow: hidden;font-size: 100px;filter: alpha(opacity=0);opacity: 0;" type="file" data-role="magic-overlay" multiple="multiple" data-target="#attachVideoBtn' + editorID + '" data-edit="insertVideo"/><i data-icon="&#xf05e3" style="z-index: 10"></i></span>'
            },
            {
                "strHtml": '<span title="Html" class="btn btn-info" data-htmlview="' + editorID + '">Html</span>'
            },
            {
                "strHtml": '<a class="btn btn-outline-info" title="Full Screen" data-fullscreen="' + editorID + '"><i data-icon="&#xf0157"></i></a>'
            }
        ];
        var toolBarHtml = "<style> #" + editorID + "{padding: 4px} .btn-toolbar ul li{cursor: pointer;}.colorSelector{height: 20px;width: 20px;margin: 2px;float: left;} .btn-toolbar .btn{padding: 0.2rem 0.4rem;font-size: 0.75rem;height: 1.6rem;}</style>";
        toolBarHtml += '<div id="' + editorID + 'Wrap" style="height:' + userOptions.editor_height + 'px;width:100%;z-index:1050;left:0;top:0"><div id="' + editorID + 'ToolBar" class="btn-toolbar w-100 bg-light p-2 border border-bottom-0 rounded-top" data-role="editor-toolbar" data-target="#' + editorID + '">';
        for (var i in toolBar) {
            toolBarHtml += ' <div class="btn-group btn-group-sm mr-1">';
            if (toolBar[i].btns !== undefined)
                for (var j in toolBar[i].btns) {
                    toolBarHtml += ' <a class="btn btn-outline-info" data-edit="' + toolBar[i].btns[j].dataedit + '" title="' + toolBar[i].btns[j].title + '"><i data-icon="' + toolBar[i].btns[j].ico + '"></i></a>';
                }
            if (toolBar[i].dmenu !== undefined) {
                toolBarHtml += ' <a class="btn btn-outline-info dropdown-toggle" data-toggle="dropdown" title="' + toolBar[i].dmenu.title + '"><i data-icon="' + toolBar[i].dmenu.ico + '"></i><b class="caret"></b></a>';
                toolBarHtml += ' <ul class="dropdown-menu">';
                for (var k in toolBar[i].dmenu.dropdownMenu) {
                    if (toolBar[i].dmenu.dropdownMenu[k].dataedit != null && toolBar[i].dmenu.dropdownMenu[k].dataedit != '')
                        toolBarHtml += '<li><a data-edit="' + toolBar[i].dmenu.dropdownMenu[k].dataedit + '" style="' + toolBar[i].dmenu.dropdownMenu[k].style + '">' + toolBar[i].dmenu.dropdownMenu[k].tit + '</a></li>';
                    else
                        toolBarHtml += '<li><a style="' + toolBar[i].dmenu.dropdownMenu[k].style + '">' + toolBar[i].dmenu.dropdownMenu[k].tit + '</a></li>';
                }
                toolBarHtml += '</ul>';
            }
            if (toolBar[i].strHtml !== undefined) {
                toolBarHtml += toolBar[i].strHtml;
            }
            toolBarHtml += '</div>';
        }
        toolBarHtml += '</div>';
        toolBarHtml += '<div id="' + editorID + '" data-editor="' + editorID + '" class="ignore lead bg-white w-100 border border-top-0 rounded-bottom" data-placeholder="Enter here..." style="overflow: scroll; ">' + $(this).val() + '</div>';
        toolBarHtml += '<textarea  id="' + editorID + 'Html"  class="bg-white w-100 border border-top-0 rounded-bottom d-none"></textarea>';
        toolBarHtml += '</div>';
        $(this).before(toolBarHtml);

        $('#' + editorID).wysiwyg(userOptions);
        $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 50) + 'px');
        $("#" + editorID + "Html").height(($("#" + editorID + "Wrap").height() - 50) + 'px');
        $(document).on("click", "#insertTable" + editorID, function () {
            alertify.confirm("Table propertes", "Rows:<input type='number' id='" + editorID + "TableRows' value='3' class='form-control' />" +
                "Colums:<input type='number' id='" + editorID + "TableColums'  value='3' class='form-control' />" +
                "Width:<div class='input-group'><input id='" + editorID + "TableWidth' type='number' value='100' class='form-control'/><select id='" + editorID + "TableWidthUnit' class='form-control'><option value='%'>%</option><option value='px'>px</option></select></div>" +
                "Border:<div class='input-group'><input id='" + editorID + "TableBorder' type='number' class='form-control' value='1'/><input id='" + editorID + "TableBorderColor' type='color' class='form-control' value='#9a9a9a'/></div>" +
                "Row height(px):<input id='" + editorID + "TableRowHeight' class='form-control' type='number' value='30'/>",
                function () {
                    var tabelRows = parseInt($("#" + editorID + "TableRows").val()),
                        tabelColums = parseInt($("#" + editorID + "TableColums").val()),
                        tabelWidth = parseInt($("#" + editorID + "TableWidth").val()),
                        tableWidthUnit = $("#" + editorID + "TableWidthUnit").val(),
                        tableBorder = parseInt($("#" + editorID + "TableBorder").val()),
                        tableBorderColor = $("#" + editorID + "TableBorderColor").val(),
                        tableRowHeight = parseInt($("#" + editorID + "TableRowHeight").val());

                    var tableHtml = '<table style="width:' + tabelWidth + tableWidthUnit + '" border="' + tableBorder + 'px" bordercolor="' + tableBorderColor + '">';
                    for (var x = 0; x < tabelRows; x++) {
                        tableHtml += '<tr style="height: ' + tableRowHeight + 'px">';
                        for (var y = 0; y < tabelColums; y++) {
                            tableHtml += '<td  border="' + tableBorder + 'px" bordercolor="' + tableBorderColor + '"></td>';
                        }
                        tableHtml += '</tr>';
                    }
                    $('#' + editorID).append(tableHtml);

                }, function () {
                });
        });
        $('#' + editorID).focus();
        $($(this).parents('form')[0]).submit(function (e) {
            $(thisInput).val($('#' + editorID).getWysiwygHtml(userOptions));
        });
        $(document).on("dblclick", "#" + editorID + " a", function () {
            var url = $(this).attr("href");
            var obj = $(this);
            alertify.prompt('URL', '', url
                , function (evt, value) {
                    $(obj).attr("href", value);
                }
                , function () {
                }
            );
        });
        $(document).on("dblclick", "#" + editorID + " img", function () {
            var obj = $(this);
            var widthOfImg = $(this).width();
            var heightOfImg = $(this).height();
            alertify.confirm("Image propertes", "Width:<input type='range' id='" + editorID + "ImgWidth' min='1' max='2000' value='" + widthOfImg + "' class='form-control' />" +
                "Height:<input type='range' id='" + editorID + "ImgHeight' min='1' max='2000'  value='" + heightOfImg + "' class='form-control'  />" +
                "Position:<select id='" + editorID + "ImgPos' class='form-control'><option value='float-none'>float none</option><option value='mx-auto d-block'>center</option><option value='float-left'>float left</option><option value='float-right'>float right</option></select>",
                function () {
                    $(obj).height($("#" + editorID + "ImgHeight").val());
                    $(obj).width($("#" + editorID + "ImgWidth").val());
                    $(obj).removeClass();
                    $(obj).addClass($("#" + editorID + "ImgPos").val());
                }, function () {
                });
        });
        $(document).on("mouseenter", "#" + editorID + " img,#" + editorID + " video", function () {
            $(this).draggable({axis: "x", containment: "#" + editorID});
        }).on("mouseleave", "#" + editorID + " img", function () {
            $(this).draggable("destroy");
        });
        $(document).on("click", "#" + editorID + " video", function () {
            var obj = $(this);
            var widthOfVideo = $(this).width();
            var heightOfVideo = $(this).height();
            alertify.confirm("Video propertes", "Width:<input type='range' id='" + editorID + "VideoWidth' min='1' max='2000' value='" + widthOfVideo + "' class='form-control' />" +
                "Height:<input type='range' id='" + editorID + "VideoHeight' min='1' max='2000'  value='" + heightOfVideo + "' class='form-control'  />" +
                "Position:<select id='" + editorID + "VideoPos' class='form-control'><option value='float-none'>float none</option><option value='mx-auto d-block'>center</option><option value='float-left'>float left</option><option value='float-right'>float right</option></select>",
                function () {
                    $(obj).height($("#" + editorID + "VideoHeight").val());
                    $(obj).width($("#" + editorID + "VideoWidth").val());
                    $(obj).removeClass();
                    $(obj).addClass($("#" + editorID + "VideoPos").val());
                }, function () {
                });
        });
        $(document).on("click", "[data-fullscreen='" + editorID + "']", function () {
            var editorID = $(this).attr("data-fullscreen");
            var h = $("#" + editorID + "Wrap").height();
            if (h == userOptions.editor_height) {
                $("#" + editorID + "Wrap").css({'height': '100vh', 'position': 'fixed'});
                $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 40) + 'px');
                $("#" + editorID + "Html").height(($("#" + editorID + "Wrap").height() - 40) + 'px');
            }
            else {
                $("#" + editorID + "Wrap").css({'height': userOptions.editor_height + 'px', 'position': 'relative'});
                $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 40) + 'px');
                $("#" + editorID + "Html").height(($("#" + editorID + "Wrap").height() - 40) + 'px');
            }
        });
        $(document).on("click", "[data-htmlview='" + editorID + "']", function () {
            var editorID = $(this).attr("data-htmlview");
            if ($("#" + editorID).is(':visible')) {
                $("#" + editorID).hide();
                $("#" + editorID + "Html").val($("#" + editorID).html());
                $("#" + editorID + "Html").removeClass("d-none");
                $("#" + editorID + "Wrap").find('.btn-toolbar .btn').each(function () {
                    $(this).addClass("disabled");
                });
                $("#" + editorID + "Wrap").find('.btn-toolbar input').each(function () {
                    $(this).attr("disabled", "disabled");
                });
            } else {
                $("#" + editorID + "Html").addClass("d-none");
                $("#" + editorID).html($("#" + editorID + "Html").val());
                $("#" + editorID).show();
                $("#" + editorID + "Wrap").find('.btn-toolbar .btn').each(function () {
                    $(this).removeClass("disabled");
                });
                $("#" + editorID + "Wrap").find('.btn-toolbar input').each(function () {
                    $(this).removeAttr("disabled");
                });
            }
        });
    };
})
(window, window.jQuery);
