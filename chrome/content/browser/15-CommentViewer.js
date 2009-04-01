
/*
 * ToDo: iframe ではなく XUL で描画する
 */

const EXPORT = ['CommentViewer'];

let commentCache = new ExpireCache('uComment', 60 * 60, 'uneval'); // 一時間キャッシュ

// local utility 
this.__defineGetter__('aWin', function() Application.activeWindow);
this.__defineGetter__('aDoc', function() Application.activeWindow.activeTab.document);
this.__defineGetter__('isHttp', function() aDoc && aDoc.location.protocol.indexOf('http') == 0);

elementGetter(this, 'panelComment', 'hBookmark-panel-comment', document);
elementGetter(this, 'commentButton', 'hBookmark-status-comment', document);
elementGetter(this, 'statusbar', 'status-bar', document);

const CMD_EVENT_NAME = 'hBookmark-view-comments';

window.addEventListener(CMD_EVENT_NAME, function(ev) {
    let m = CommentViewer.dispatchMethods[ev.getData('method')];
    if (m) m(ev.getData('data'));
}, false);

let throwEvent = function(method, data) {
     let ev = window.document.createEvent('DataContainerEvent');
     ev.initEvent(CMD_EVENT_NAME, false, false);
     ev.setData('method', method);
     ev.setData('data', data);
     window.dispatchEvent(ev);
}

var CommentViewer = {
    showClick: function CommentViewer_show() {
        if (panelComment.state == 'closed')
            CommentViewer.show();
    },
    show: function CommentViewer_show(url) {
        if (!url) {
            if (!isHttp) return;
            url = aDoc.location.href;
        }
        commentButton.setAttribute('loading', 'true'); 
        var self = this;
        HTTPCache.comment.async_get(url, function(data) {
            if (!data || !data.title) {
                data = {};
                data.url = data.title = url;
                data.bookmarks = [];
            }
            data.favicon = favicon(data.url);
            self.updateComment(data);
        });
    },
    toggle: function CommentViewer_toggle(url) {
        if (!url && isHttp) {
            url = aDoc.location.href;
        }
        if (panelComment.state != 'close' && url != CommentViewer.currentURL) {
            CommentViewer.show(url);
        } else {
            CommentViewer.hide();
        }
    },
    currentURL: null,
    updateComment: function CommentViewer_updateComment(data) {
        CommentViewer.currentURL = data.url;
        CommentViewer.iframe.setAttribute('height', '0px');
        panelComment.openPopup(statusbar, 'before_end', -20, 0,false,false);
        // 非表示ユーザをフィルター
        let regex = User.user.ignores;
        if (regex) {
            data.bookmarks = data.bookmarks.filter(function(b) !regex.test(b.user));
        }
        //if (data.bookmarks && data.bookmarks.length) {
            throwEvent('load-json', data);
        //} else {
        //    CommentViewer.hide();
        //}
        commentButton.setAttribute('loading', 'false'); 
    },
    createIFrame: function() {
        if (!CommentViewer.iframe) {
            CommentViewer.iframe = document.createElement('iframe');
            CommentViewer.iframe.setAttribute('src', 'chrome://hatenabookmark/content/commentViewer.html') 
            CommentViewer.iframe.setAttribute('id', 'hBookmark-comment-viewer');

            panelComment.appendChild(CommentViewer.iframe);
        }
    },
    hide: function CommentViewer_hide() {
        if (panelComment.state != 'closed') {
            panelComment.hidePopup();
        }
        CommentViewer.currentURL = null;
    }
}

CommentViewer.dispatchMethods = {
    close: function() {
        CommentViewer.hide();
    },
    rendered: function(o) {
        // let doc = window.content.document;
        // let maxHeight = (doc.compatMode == 'CSS1Compat' ? doc.documentElement.clientHeight : doc.body.clientHeight) - 40;
        let maxHeight = window.content.innerHeight - 40;
        let maxWidth = window.content.innerWidth - 40;
        if (o.height < 100)
            o.height = 100;
        if (o.height < maxHeight) {
            panelComment.setAttribute('height', '' + o.height + 'px');
            CommentViewer.iframe.setAttribute('height', '' + o.height + 'px');
        } else {
            panelComment.setAttribute('height', '' + maxHeight + 'px');
            CommentViewer.iframe.setAttribute('height',  '' + maxHeight + 'px');
        }
        panelComment.setAttribute('width', '' + maxWidth + 'px');
        CommentViewer.iframe.setAttribute('width', '' + maxWidth + 'px');
    }
}

window.addEventListener('load', function() {
    p('init create commentViewer iframe');
    CommentViewer.createIFrame();
}, false);

