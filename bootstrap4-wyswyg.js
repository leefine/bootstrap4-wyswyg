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
            upload_doc_type: 'doc|docx|xls|xlsx|ppt|pptx|ppsx|pdf',
            upload_file_max_size_m: 50,
            fileUploadError: function (reason, detail) {
                console.log("File upload error", reason, detail);
            }
        };

        var options = $.extend(true, {}, defaults, userOptions);
        var toolbarBtnSelector = "a[data-" + options.commandRole + "],button[data-" + options.commandRole + "],input[type=button][data-" + options.commandRole + "]";

        if (options.dragAndDropImages) {
            this.initFileDrops(editor, options, toolbarBtnSelector);
        }

        this.bindToolbar(editor, $(options.toolbarSelector), options, toolbarBtnSelector);

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
        var commandArr = commandWithArgs.split(" "),
            command = commandArr.shift(),
            args = commandArr.join(" ") + ( valueArg || "" );

        var parts = commandWithArgs.split("-");

        if (parts.length === 1) {
            document.execCommand(command, false, args);
        } else if (parts[0] === "format" && parts.length === 2) {
            document.execCommand("formatBlock", false, parts[1]);
        }

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

    // Adding Toggle HTML based on the work by @jd0000, but cleaned up a little to work in this context.
    Wysiwyg.prototype.toggleHtmlEdit = function (editor) {
        if (editor.data("wysiwyg-html-mode") !== true) {
            var oContent = editor.html();
            var editorPre = $("<pre />");
            $(editorPre).append(document.createTextNode(oContent));
            $(editorPre).attr("contenteditable", true);
            $(editor).html(" ");
            $(editor).append($(editorPre));
            $(editor).attr("contenteditable", false);
            $(editor).data("wysiwyg-html-mode", true);
            $(editorPre).focus();
        } else {
            $(editor).html($(editor).text());
            $(editor).attr("contenteditable", true);
            $(editor).data("wysiwyg-html-mode", false);
            $(editor).focus();
        }
    };

    Wysiwyg.prototype.insertFiles = function (files, fileInputName, options, editor, toolbarBtnSelector) {
        var self = this;
        $.each(files, function (idx, fileInfo) {
            if (fileInfo.size > (options.upload_file_max_size_m * 1024 * 1024)) {
                alertify_ex.alert(fileInfo.name + ' is too big,max size is ' + maxUploadSizeByte + 'M');
                return true;
            }
            var imgReg = new RegExp(options.upload_img_type);
            var docReg = new RegExp(options.upload_doc_type);
            if ((fileInputName == 'Image' || fileInputName == 'drag') && /^image\//.test(fileInfo.type) && imgReg.test(fileInfo.name.toLowerCase())) {
                $.when(self.readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
                    self.execCommand("insertimage", dataUrl, editor, options, toolbarBtnSelector);
                    editor.trigger("image-inserted");
                }).fail(function (e) {
                    alertify_ex.alert('Read file failed');
                    options.fileUploadError("file-reader", e);
                });
            } else if ((fileInputName == 'attachFile' || fileInputName == 'drag') && /^application\//.test(fileInfo.type) && docReg.test(fileInfo.name.toLowerCase())) {
                $.when(self.readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
                    var uuid = $.fn.wysiwyg.guid();
                    var fileName = relpath + "/res/post_file/" + uuid + fileInfo.name.substring(fileInfo.name.lastIndexOf("."), fileInfo.name.length);
                    $(editor).after("<input value='" + uuid + "~" + dataUrl + "' type='hidden' name='post_file'/>");
                    document.execCommand("insertHTML", false, '<br/><a href="' + fileName + '" class="icon-file text-danger">' + fileInfo.name + '</a><br/>');
                }).fail(function (e) {
                    alertify_ex.alert('Read file failed');
                    options.fileUploadError("file-reader", e);
                });
            }
            else {
                var eMsg = "";
                if (fileInputName == 'Image') eMsg = options.upload_img_type;
                if (fileInputName == 'attachFile') eMsg = options.upload_doc_type;
                if (eMsg.length < 1) eMsg = options.upload_img_type + '|' + options.upload_doc_type;
                alertify_ex.alert('Unsupported file type! Please upload type:' + eMsg);
                options.fileUploadError("unsupported-file-type", fileInfo.type);
            }
        });
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

            if (editor.data(options.commandRole) === "html") {
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
                var cR = document.execCommand(cmdBtn, false, $(this).attr('data-color'));
                return;
            }
            else if (cmdBtn == 'foreColor') {
                document.execCommand(cmdBtn, false, $(this).attr('data-color'));
                self.saveSelection();
            }
            else {
                self.execCommand(cmdBtn, null, editor, options, toolbarBtnSelector);
                self.saveSelection();
            }
        }).on("blur", function () {
            var input = $(this);
            self.markSelection(false, options);
        });
        toolbar.find("input[type=file][data-" + options.commandRole + "]").change(function () {
            self.restoreSelection();
            if (this.type === "file" && this.files && this.files.length > 0) {
                self.insertFiles(this.files, this.name, options, editor, toolbarBtnSelector);
            }
            self.saveSelection();
            this.value = "";
        });
    };

    Wysiwyg.prototype.initFileDrops = function (editor, options, toolbarBtnSelector) {
        var self = this;
        editor.on("dragenter dragover", false).on("drop", function (e) {
            var dataTransfer = e.originalEvent.dataTransfer;
            e.stopPropagation();
            e.preventDefault();
            if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
                self.insertFiles(dataTransfer.files, 'drag', options, editor, toolbarBtnSelector);
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

    $.fn.wysiwyg.guid = function () {
        function S4() {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }

        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    };

    $.fn.wysiwyg.getHtml = function (container, ifImgConvert) {
        if (ifImgConvert !== undefined && ifImgConvert == true) {
            var gGal = $.parseHTML('<div>' + $(container).html() + '</div>');
            if ($(gGal).has("img").length) {
                var gImages = $("img", $(gGal));
                var ifExistImg = false;
                $.each(gImages, function (i, v) {
                    if ($(v).attr("src").match(/^data:image\/.*$/)) {
                        var uuid = $.fn.wysiwyg.guid();
                        var picName = uuid + '.' + $(v).attr("src").substring($(v).attr("src").indexOf("/") + 1, $(v).attr("src").indexOf(";"));//后缀名
                        $(container).after("<input value='" + uuid + "~" + $(v).attr("src") + "' type='hidden' name='post_img'/>");
                        $(v).attr("src", relpath + "/res/post_img/" + picName);
                        ifExistImg = true;
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
    $.fn.initWysiwyg = function (ifImgConvert, editorHeight, userOptions) {
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
                    "ico": "&#xf072f;", "title": "Font Size",
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
                    "ico": "&#xf0731;", "title": "Heading",
                    "dropdownMenu": [
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
                "strHtml": '<a class="btn btn-outline-info dropdown-toggle" data-toggle="dropdown" title="Hyperlink"><i data-icon="&#xf0d2d"></i></a><div class="dropdown-menu dropdown-menu-right" style="width: 300px;"><div class="input-group p-xl-2"> <input placeholder="URL" type="text" data-edit="createLink" class="form-control"/><div class="input-group-append"> <button class="btn" type="button">Add</button></div> </div></div>'
            },
            {
                "strHtml": '<span class="btn btn-outline-info" title="Insert picture (or just drag & drop)" id="pictureBtn"> <input style="z-index:10;width: 100%;height:100%;position: absolute;left: 0px;top: 0px; overflow: hidden;font-size: 100px;filter: alpha(opacity=0);opacity: 0;" type="file" name="Image" accept="image/*" data-role="magic-overlay" data-target="#pictureBtn" data-edit="insertImage"><i data-icon="&#xf0a80" style="z-index: 10"></i></span>'
            },
            {
                "strHtml": '<span class="btn btn-outline-info" title="Attach file (or just drag & drop)" id="attachFileBtn"> <input style="z-index:10;width: 100%;height:100%;position: absolute;left: 0px;top: 0px; overflow: hidden;font-size: 100px;filter: alpha(opacity=0);opacity: 0;" type="file" name="attachFile" data-role="magic-overlay" data-target="#attachFileBtn" data-edit="insertFile"><i data-icon="&#xf00c0" style="z-index: 10"></i></span>'
            },
            {
                "strHtml": '<a class="btn btn-outline-info" title="Full Screen" data-fullscreen="' + editorID + '"><i data-icon="&#xf0157"></i></a>'
            }
        ];

        if (editorHeight === undefined) editorHeight = "300";
        var toolBarHtml = "<style> #" + editorID + "{padding: 4px} .btn-toolbar ul li{cursor: pointer;}.colorSelector{height: 20px;width: 20px;margin: 2px;float: left;}</style>";
        toolBarHtml += '<div id="' + editorID + 'Wrap" style="height:' + editorHeight + 'px;width:100%;z-index:1050;left:0;top:0"><div class="btn-toolbar w-100 bg-light p-1 border border-bottom-0 rounded-top" data-role="editor-toolbar" data-target="#' + editorID + '">';
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
        toolBarHtml += '<div id="' + editorID + '" data-editor="' + editorID + '" class="lead bg-white w-100 border border-top-0 rounded-bottom" data-placeholder="Enter here..." style="overflow: scroll; ">'+$(this).val()+'</div></div>';
        $(this).before(toolBarHtml);

        $('#' + editorID).wysiwyg(userOptions);
        $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 40) + 'px');

        var formObj = $(this).parents('form')[0];
        $(formObj).submit(function (e) {
            $(thisInput).val($.fn.wysiwyg.getHtml($('#' + editorID), ifImgConvert));
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
            var width = $(this).width();
            //var height = $(this).height();
            alertify.prompt('Width', '', width
                , function (evt, value) {
                    $(obj).width(value);
                }
                , function () {
                }
            ).set('type', 'number');
        });
        $(document).on("click", "[data-fullscreen='" + editorID + "']", function () {
            var editorID = $(this).attr("data-fullscreen");
            var h = $("#" + editorID + "Wrap").height();
            if (h == editorHeight) {
                $("#" + editorID + "Wrap").css({'height': '100vh', 'position': 'fixed'});
                $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 40) + 'px');
            }
            else {
                $("#" + editorID + "Wrap").css({'height': editorHeight + 'px', 'position': 'relative'});
                $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 40) + 'px');
            }
        });
    };
})(window, window.jQuery);
