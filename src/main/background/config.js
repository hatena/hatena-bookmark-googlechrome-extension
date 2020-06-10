
var BG = chrome.extension.getBackgroundPage();
var user = BG.UserManager.user;

Config.View = {
    autoObserve: function() {
        var self = this;
        $(':text').each(self.textUpdateHandler);
        $(':radio').each(self.radioHander);
        $('textarea').each(self.textUpdateHandler);

        /*
        Object.keys(Config.configs).forEach(function(key) {
            var targets = document.getElementsByName(key);
            for (var i = 0;  i < targets.length; i++) {
                var target = targets[i];
                self.typeObserbers[target.type](target);
            }
        });
        */
    },
    textUpdateHandler: function() {
        var target = $(this);
        var key = target.attr('name');
        target.val( Config.get(key));
        target.keyupD;
        var updateHandler = function() {
            if (target.keyupD) {
                target.keyupD.cancel();
                target.keyupD = null;
            }
            var val = target.val();
            Config.set(key, val);
            var newVal = Config.get(key);
            if (val != newVal) {
                target.val( newVal);
                Config.View.afterUpdate(key);
            }
        };
        target.bind('change', updateHandler);
        target.bind('keyup', function() {
            if (target.keyupD) target.keyupD.cancel();
            target.keyupD = Deferred.wait(1).next(function() {
                updateHandler();
            });
        });
    },
    radioHander: function(target) {
        var target = $(this);
        var key = target.attr('name');
        // bool only ... XXX
        var config = Config.configs[key];
        var culVal = Config.get(key);
        if ((culVal) && target.val() == '1') {
            target.prop('checked', true);
        } else if (!culVal && target.val() == '0') {
            target.prop('checked', true);
        }
        var updateHandler = function() {
            if (target.prop('checked')) {
                var val = target.val();
                Config.set(key, val);
                Config.View.afterUpdate(key);
            }
        };
        target.bind('change', updateHandler);
        Config.View.afterUpdate(key);
    },
    afterUpdate: function(key) {
        if (this.afterUpdates[key]) this.afterUpdates[key](key);
    },
    afterUpdates: {
        'popup.window.autosize' : function(key) {
            var val = Config.get(key);
            $("input.popup-input-size").each(function() {
                var el = this;
                setTimeout(function() {
                    if (val) {
                        el.setAttribute('disabled', true);
                    } else {
                        el.removeAttribute('disabled');
                    }
                }, 10);
            });
        },
        'popup.commentviewer.autodetect.enabled' : function(key) {
            var val = Config.get(key);
            $("input.commentviewer-autodetect-input").each(function() {
                var el = this;
                setTimeout(function() {
                    if (!val) {
                        el.setAttribute('disabled', true);
                    } else {
                        el.removeAttribute('disabled');
                    }
                }, 10);
            });
        }
    },

}

function showInitDB() {
    $('#db-username').text(user.name);
    $('#init-db').show();
}

function onClickDBResetButton( evt ) {
    if (window.confirm(sprintf('ユーザー『%s』のローカルデータベースを再同期します。よろしいですか？', user.name))) {
        user.resetDatabase();
    }
}

function onClickConfigResetButton() {
    if (window.confirm('初期設定に戻します。よろしいですか？')) {
        Config.clearALL();
        location.reload();
    }
}

function updateViewAccordingToWhetherEulaAccepted() {
    if (localStorage.eula) {
        $("#eula").hide();
        $("#main-section").show();
    } else {
        $("#main-section").hide();
        $("#eula").show();
    }
}

$(function() {
    Config.View.autoObserve();
    $('body').show();
    if (user) showInitDB();
    $("#config-reset-button").bind( "click", onClickConfigResetButton );
    $("#db-reset-button").bind( "click", onClickDBResetButton );
    $(".extensions-link").bind( "click", function(){
        chrome.tabs.create({url: "chrome://extensions/"});
    });

    // XXX 利用規約への同意がされたかどうかを、`localStorage` を意識せずに扱える
    // ようにすべき。
    // 別の window における `localStorage` の変化を検知
    window.addEventListener("storage", function (evt) {
        // `localStorage.clear()` されたときは `evt.key` の値は偽値になる
        if (evt.key === "eula" || evt.key) {
            updateViewAccordingToWhetherEulaAccepted();
        }
    }, false);
    $("#eula-accept-button-ok").bind("click", function (evt) {
        // background ページで `localStorage` を変化させるので上のイベントリスナで検知できる
        BG.acceptEula();
    });
    updateViewAccordingToWhetherEulaAccepted();
});
