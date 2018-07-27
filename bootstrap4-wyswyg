(function (window, $) {
    "use strict";

    /*
     *  Represenets an editor
     *  @constructor
     *  @param {DOMNode} element - The TEXTAREA element to add the Wysiwyg to.
     *  @param {object} userOptions - The default options selected by the user.
     */
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

        editor.attr("contenteditable", true)
            .on("mouseup keyup mouseout", function () {
                this.saveSelection();
                this.updateToolbar(editor, toolbarBtnSelector, options);
            }.bind(this));

        $(window).bind("touchend", function (e) {
            var isInside = ( editor.is(e.target) || editor.has(e.target).length > 0 ),
                currentRange = this.getCurrentRange(),
                clear = currentRange && ( currentRange.startContainer === currentRange.endContainer && currentRange.startOffset === currentRange.endOffset );

            if (!clear || isInside) {
                this.saveSelection();
                this.updateToolbar(editor, toolbarBtnSelector, options);
            }
        });
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

    Wysiwyg.prototype.insertFiles = function (files, options, editor, toolbarBtnSelector) {
        var self = this;
        editor.focus();
        $.each(files, function (idx, fileInfo) {
            if (/^image\//.test(fileInfo.type) || /.+\.(bmp|gif|jpg|jpeg|png)$/.test(fileInfo.name.toLowerCase())) {
                $.when(self.readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
                    self.execCommand("insertimage", dataUrl, editor, options, toolbarBtnSelector);
                    editor.trigger("image-inserted");
                }).fail(function (e) {
                    options.fileUploadError("file-reader", e);
                });
            } else {
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
            var newValue = this.value;  // Ugly but prevents fake double-calls due to selection restoration
            this.value = "";
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
        toolbar.find("input[type=file][data-" + options.commandRole + "]").change(function () {
            self.restoreSelection();
            if (this.type === "file" && this.files && this.files.length > 0) {
                self.insertFiles(this.files, options, editor, toolbarBtnSelector);
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
                self.insertFiles(dataTransfer.files, options, editor, toolbarBtnSelector);
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

    $.fn.wysiwyg.getHtml = function (container, ifImgConvert) {
        var guid = function () {
            function S4() {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            }

            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
        };

        if (ifImgConvert !== undefined && ifImgConvert == true) {
            var gGal = $.parseHTML('<div>' + $(container).html() + '</div>');
            if ($(gGal).has("img").length) {
                var gImages = $("img", $(gGal));
                var uuid = guid();
                var ifExistImg = false;
                $.each(gImages, function (i, v) {
                    if ($(v).attr("src").match(/^data:image\/.*$/)) {
                        ifExistImg = true;
                        var picName = uuid + '_' + i + '.' + $(v).attr("src").substring($(v).attr("src").indexOf("/") + 1, $(v).attr("src").indexOf(";"));//后缀名
                        $(container).before("<input value='" + $(v).attr("src") + "' type='hidden' name='post_img'/>");
                        $(v).attr("src", relpath + "/res/post_img/" + picName);
                    }
                });
                if (ifExistImg) $(container).after("<input value='" + uuid + "' type='hidden' name='post_img_id' />");
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
    $.fn.initWysiwyg = function (ifImgConvert, editorHeight) {
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
                    {"ico": "&#xf007f", "title": "Horizontal", "dataedit": "insertHorizontalRule"},
                    {"ico": "&#xf0973", "title": "Remove Hyperlink", "dataedit": "unlink"}
                ]
            },

            {
                "dmenu": {
                    "ico": "&#xf0731;", "title": "Font Size",
                    "dropdownMenu": [
                        {"dataedit": "fontSize 3", "style": "display: block", "tit": "<font size=\"3\">3</font>"},
                        {"dataedit": "fontSize 4", "style": "display: block", "tit": "<font size=\"4\">4</font>"},
                        {"dataedit": "fontSize 5", "style": "display: block", "tit": "<font size=\"5\">5</font>"},
                        {"dataedit": "fontSize 6", "style": "display: block", "tit": "<font size=\"6\">6</font>"},
                        {"dataedit": "fontSize 7", "style": "display: block", "tit": "<font size=\"7\">7</font>"}
                    ]
                }
            },
            {
                "dmenu": {
                    "ico": "&#xf089a;", "title": "Font Color",
                    "dropdownMenu": [
                        {"dataedit": "foreColor #000000", "style": "color: #000000;display: block", "tit": "Black"},
                        {"dataedit": "foreColor #0000FF", "style": "color: #0000FF;display: block", "tit": "Blue"},
                        {"dataedit": "foreColor #30AD23", "style": "color: #30AD23;display: block", "tit": "Green"},
                        {"dataedit": "foreColor #FF7F00", "style": "color: #FF7F00;display: block", "tit": "Orange"},
                        {"dataedit": "foreColor #FF0000", "style": "color: #FF0000;display: block", "tit": "Red"},
                        {"dataedit": "foreColor #FFFF00", "style": "color: #FFFF00;display: block", "tit": "Yellow"}
                    ]
                }
            },
            {
                "dmenu": {
                    "ico": "&#xf05dc;", "title": "Background color",
                    "dropdownMenu": [
                        {
                            "dataedit": "backColor #00FFFF",
                            "style": "background-color: #00FFFF;display: block",
                            "tit": "Blue"
                        },
                        {
                            "dataedit": "backColor #00FF00",
                            "style": "background-color: #00FF00;display: block",
                            "tit": "Green"
                        },
                        {
                            "dataedit": "backColor #FF7F00",
                            "style": "background-color: #FF7F00;display: block",
                            "tit": "Orange"
                        },
                        {
                            "dataedit": "backColor #FF0000",
                            "style": "background-color: #FF0000;display: block",
                            "tit": "Red"
                        },
                        {
                            "dataedit": "backColor #FFFF00",
                            "style": "background-color: #FFFF00;display: block",
                            "tit": "Yellow"
                        }
                    ]
                }
            },
            {
                "btns": [
                    {"ico": "&#xf081d", "title": "Bullet list", "dataedit": "insertunorderedlist"},
                    {"ico": "&#xf081c", "title": "Number list", "dataedit": "insertorderedlist"},
                    {"ico": "&#xf074c", "title": "Reduce indent", "dataedit": "outdent"},
                    {"ico": "&#xf074b", "title": "Indent", "dataedit": "indent"},
                ]
            },
            {
                "btns": [
                    {"ico": "&#xf0747", "title": "Align Left", "dataedit": "justifyleft"},
                    {"ico": "&#xf0748", "title": "Center", "dataedit": "justifycenter"},
                    {"ico": "&#xf0749", "title": "Align Right", "dataedit": "justifyright"},
                    {"ico": "&#xf074a", "title": "Justify", "dataedit": "justifyfull"},
                ]
            },
            {
                "strHtml": '<a class="btn btn-outline-info dropdown-toggle" data-toggle="dropdown" title="Hyperlink"><i data-icon="&#xf0d2d"></i></a><div class="dropdown-menu dropdown-menu-right" style="width: 300px;"><div class="input-group p-xl-2"> <input placeholder="URL" type="text" data-edit="createLink" class="form-control"/><div class="input-group-append"> <button class="btn" type="button">Add</button></div> </div></div>'
            },
            {
                "strHtml": '<span class="btn btn-outline-info" title="Insert picture (or just drag & drop)" id="pictureBtn"> <input style="z-index:10;width: 100%;height:100%;position: absolute;left: 0px;top: 0px; overflow: hidden;font-size: 100px;filter: alpha(opacity=0);opacity: 0;" type="file" name="Image" data-role="magic-overlay" data-target="#pictureBtn" data-edit="insertImage"><i data-icon="&#xf0a80" style="z-index: 10"></i></span>'
            },
            {
                "strHtml": '<a class="btn btn-outline-info" data-edit="clearformat" title="Clear Formatting" onClick="$(\'#' + editorID + '\').html($(\'#' + editorID + '\').text());"><i data-icon="&#xf0995"></i></a>'
            },
            {
                "strHtml": '<a class="btn btn-outline-info" title="Full Screen" data-fullscreen="' + editorID + '"><i data-icon="&#xf0157"></i></a>'
            }
        ];

        if (editorHeight === undefined) editorHeight = "300";
        var toolBarHtml = '<div id="' + editorID + 'Wrap" style="height:' + editorHeight + 'px;width:100%"><div class="btn-toolbar w-100 bg-light p-1 border border-bottom-0 rounded-top" data-role="editor-toolbar" data-target="#' + editorID + '">';
        for (var i in toolBar) {
            toolBarHtml += ' <div class="btn-group btn-group-sm">';
            for (var j in toolBar[i].btns) {
                toolBarHtml += ' <a class="btn btn-outline-info" data-edit="' + toolBar[i].btns[j].dataedit + '" title="' + toolBar[i].btns[j].title + '"><i data-icon="' + toolBar[i].btns[j].ico + '"></i></a>';
            }
            if (toolBar[i].dmenu !== undefined) {
                toolBarHtml += ' <a class="btn btn-outline-info dropdown-toggle" data-toggle="dropdown" title="' + toolBar[i].dmenu.title + '"><i data-icon="' + toolBar[i].dmenu.ico + '"></i><b class="caret"></b></a>';
                toolBarHtml += ' <ul class="dropdown-menu">';
                for (var k in toolBar[i].dmenu.dropdownMenu) {
                    toolBarHtml += '<li><a data-edit="' + toolBar[i].dmenu.dropdownMenu[k].dataedit + '" style="' + toolBar[i].dmenu.dropdownMenu[k].style + '">' + toolBar[i].dmenu.dropdownMenu[k].tit + '</li>';
                }
                toolBarHtml += '</ul>';
            }
            if (toolBar[i].strHtml !== undefined) {
                toolBarHtml += toolBar[i].strHtml;
            }
            toolBarHtml += '</div>';
        }
        toolBarHtml += '</div>';
        toolBarHtml += '<div id="' + editorID + '" data-editor="' + editorID + '" class="lead bg-white w-100 border border-top-0 rounded-bottom" data-placeholder="Enter here..." style="overflow: scroll; "></div></div>';
        $(this).before(toolBarHtml);

        $('#' + editorID).wysiwyg();
        $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 40) + 'px');

        var formObj = $(this).parents('form')[0];
        $(formObj).submit(function (e) {
            $(thisInput).val($.fn.wysiwyg.getHtml($('#' + editorID), ifImgConvert));
        });

        $(document).on("click", "#" + editorID + " a", function () {
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
        $(document).on("click", "#" + editorID + " img", function () {
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
                $("#" + editorID + "Wrap").css({'height': '100vh', 'position': 'absolute', 'top': '0'});
                $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 40) + 'px');
            }
            else {
                $("#" + editorID + "Wrap").css({'height': editorHeight + 'px', 'position': 'relative', 'top': '0'});
                $("#" + editorID).height(($("#" + editorID + "Wrap").height() - 40) + 'px');
            }
        });
    };
})(window, window.jQuery);
