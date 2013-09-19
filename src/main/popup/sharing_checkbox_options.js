/**
 * ブックマーク追加の際の "共有" に関するオプションのチェックボックスの
 * 動作に関する JavaScript コード
 */
var sharingOptions = {};
(function namespace() {
    var model;
    function expandSharingOptions( evt ) {
        $("#checkbox-options").addClass( "expanded" );
        $(document.body).addClass( "sharing-options-panel-opend" );
        $(document).bind( "click", onClickDocument );
    }
    function minimizeSharingOptions( evt ) {
        $("#checkbox-options").removeClass( "expanded" );
        $(document.body).removeClass( "sharing-options-panel-opend" );
        $(document).unbind( "click", onClickDocument );
    }
    function onClickDocument( evt ) {
        if ( ! $(evt.target).closest('#checkbox-options').length ) {
            minimizeSharingOptions();
        }
    }
    /** チェックボックスの状態が変化した場合に呼び出される controller */
    function onViewStateChange( evt ) {
        var m = model[$(this).data( "modelId" )];
        // tooltip を出す必要があるなら出す
        if ( m.tooltipId ) { // tooltip を出す可能性があって
            if( ! m.doPost && this.checked ) { // 偽から真に変化したとき
                View.bookmark.optionHelpTooltipManager.showTooltip( m.tooltipId );
            }
        }
        m.doPost = this.checked;
        var confId = m.info.configId;
        if ( confId ) {
            Config.set( 'popup.bookmark.' + confId, this.checked );
        }
        makeViewCorrespondToModel();
    }
    function initTemplatedListItemExpanded( $templateElem, itemInfo ) {
        var $cloned = $templateElem.clone();
        $cloned.attr( "id", null );
        var img = new Image();
        img.src = itemInfo["icon_img_src"];
        $cloned.find( ".icon-img" ).replaceWith( img );
        $cloned.find( "label" ).prop( "title", itemInfo["title"] );
        var $inputElem = $cloned.find( "input" );
        var id = itemInfo["id"];
        $inputElem.prop( "name", itemInfo["name"] );
        $inputElem.prop( "id", id );
        $inputElem.attr( "tabindex", 12 );
        $inputElem.bind( "change", onViewStateChange );
        $inputElem.data( "modelId", itemInfo["modelId"] );
        $cloned.find( ".displayed-name" ).text( itemInfo["disp_name"] );
        $cloned.insertBefore( $templateElem );
        return id;
    }
    function initTemplatedListItemMinimized( $templateElem, itemInfo ) {
        var $cloned = $templateElem.clone();
        $cloned.attr( "id", null );
        var img = new Image();
        img.src = itemInfo["icon_img_src"];
        $cloned.find( ".icon-img" ).replaceWith( img );
        $cloned.find( "label" ).prop( "title", itemInfo["title"] );
        var $inputElem = $cloned.find( "input" );
        var id = itemInfo["id"] + "-minimized";
        //$inputElem.prop( "name", itemInfo["name"] + "-minimized" );
        $inputElem.prop( "id", id );
        $inputElem.attr( "tabindex", 11 );
        $inputElem.bind( "change", onViewStateChange );
        $inputElem.data( "modelId", itemInfo["modelId"] );
        $cloned.insertBefore( $templateElem );
        return id;
    }
    function makeViewCorrespondToModel() {
        for ( var modelId in model ) {
            var m = model[modelId];
            for ( var i = 0, len = m.viewIds.length; i < len; ++ i ) {
                var $inputElem = $("#"+m.viewIds[i]);
                $inputElem.prop( "disabled", m.disabled );
                $inputElem.prop( "checked", m.disabled ? false : m.doPost );
                var $labelElem = $inputElem.parent();
                if ( m.disabled ) {
                    $labelElem.prop( "title",
                            "非公開ブックマークは " + m.info.disp_name + " へ投稿されません." );
                    $labelElem.addClass( "disabled" );
                } else {
                    $labelElem.prop( "title", m.info.title );
                    $labelElem.removeClass( "disabled" );
                }
            }
        }
    }
    /* 非公開ブクマの場合は, Twitter などの連携をできなくする */
    sharingOptions.setPrivate = setPrivate;
    function setPrivate( isPrivate ) {
        model.postTwitter.disabled = isPrivate;
        model.postFacebook.disabled = isPrivate;
        model.postMixiCheck.disabled = isPrivate;
        makeViewCorrespondToModel();
    }
    sharingOptions.initSharingOptions = initSharingOptions;
    function initSharingOptions( user, bookmarkView ) {
        $("#checkbox-options-button-to-expand").bind( "click", expandSharingOptions );
        $("#checkbox-options-button-to-minimize").bind( "click", minimizeSharingOptions );
        // model 生成
        model = {};
        var info;

        var $templateElemEx = $("#checkbox-options-expanded-item-template");
        var $templateElemMin = $("#checkbox-options-minimized-item-template");

        // ここらへんもっとすっきりさせたい

        // Twitter
        model.postTwitter = { viewIds: [] };
        model.postTwitter.info = info = {
             id: "post-twitter"
            ,modelId: "postTwitter"
            ,configId: "postTwitter" // チェック状態を config で保持する際に使用
            ,name: "post_twitter"
            ,disp_name: "Twitter"
            ,icon_img_src: "/images/add-twitter.png"
            ,title: "ブックマークしたページを Twitter へ投稿する場合はチェックを入れてください。"
        };
        if ( user.canUseTwitter ) {
            model.postTwitter.available = true;
            if ( user.postTwitterChecked === 'on' ||
                    ( user.postTwitterChecked === 'inherit' &&
                     Config.get('popup.bookmark.postTwitter') ) ) {
                model.postTwitter.doPost = true;
            }
        } else {
            model.postTwitter.tooltipId = "option-help-post-twitter";
        }
        model.postTwitter.viewIds.push(
                initTemplatedListItemExpanded( $templateElemEx, info ) );
        model.postTwitter.viewIds.push(
                initTemplatedListItemMinimized( $templateElemMin, info ) );

        // Facebook
        model.postFacebook = { viewIds: [] };
        model.postFacebook.info = info = {
             id: "post-facebook"
            ,modelId: "postFacebook"
            ,configId: "postFacebook" // チェック状態を config で保持する際に使用
            ,name: "post_facebook"
            ,disp_name: "Facebook"
            ,icon_img_src: "/images/icon-facebook.png"
            ,title: "ブックマークしたページを Facebook へ投稿する場合はチェックを入れてください。"
        };
        if ( user.canUseFacebook ) {
            model.postFacebook.available = true;
            if ( user.postFacebookChecked === 'on' ||
                    ( user.postFacebookChecked === 'inherit' &&
                     Config.get('popup.bookmark.postFacebook') ) ) {
                model.postFacebook.doPost = true;
            }
        } else {
            model.postFacebook.tooltipId = "option-help-post-facebook";
        }
        model.postFacebook.viewIds.push(
                initTemplatedListItemExpanded( $templateElemEx, info ) );
        model.postFacebook.viewIds.push(
                initTemplatedListItemMinimized( $templateElemMin, info ) );

        // Evernote
        model.postEvernote = { viewIds: [] };
        model.postEvernote.info = info = {
             id: "post-evernote"
            ,modelId: "postEvernote"
            ,configId: "postEvernote"
            ,name: "post_evernote"
            ,disp_name: "Evernote"
            ,icon_img_src: "/images/icon-evernote.png"
            ,title: "ブックマークしたページを Evernote へ投稿する場合はチェックを入れてください。"
        };
        if ( user.canUseEvernote ) {
            model.postEvernote.available = true;
            if ( user.postEvernoteChecked === 'on' ||
                    ( user.postEvernoteChecked === 'inherit' &&
                     Config.get('popup.bookmark.postEvernote') ) ) {
                model.postEvernote.doPost = true;
            }
        } else {
            model.postEvernote.tooltipId = "option-help-post-evernote";
        }
        model.postEvernote.viewIds.push(
                initTemplatedListItemExpanded( $templateElemEx, info ) );
        model.postEvernote.viewIds.push(
                initTemplatedListItemMinimized( $templateElemMin, info ) );

        // mixi check
        model.postMixiCheck = { viewIds: [] };
        model.postMixiCheck.info = info = {
             id: "post-mixi-check"
            ,modelId: "postMixiCheck"
            ,configId: "postMixiCheck" // チェック状態を config で保持する際に使用
            ,name: "post_mixi_check"
            ,disp_name: "Mixi チェック"
            ,icon_img_src: "/images/icon-mixi.png"
            ,title: "ブックマークしたページを Mixi チェックへ投稿する場合はチェックを入れてください。"
        }
        if ( user.canUseMixiCheck ) {
            model.postMixiCheck.available = true;
            if ( user.postMixiCheckChecked === 'on' ||
                    ( user.postMixiCheckChecked === 'inherit' &&
                     Config.get('popup.bookmark.postMixiCheck') ) ) {
                model.postMixiCheck.doPost = true;
            }
        } else {
            model.postMixiCheck.tooltipId = "option-help-post-mixi-check";
        }
        model.postMixiCheck.viewIds.push(
                initTemplatedListItemExpanded( $templateElemEx, info ) );
        if ( model.postMixiCheck.doPost ) {
            // 元々チェックが入っている場合のみ縮小版にも表示する
            model.postMixiCheck.viewIds.push(
                    initTemplatedListItemMinimized( $templateElemMin, info ) );
        }

        // mail
        model.sendMail = { viewIds: [] };
        model.sendMail.info = info = {
             id: "send_mail"
            ,modelId: "sendMail"
            //,configId: "postMail" // Mail のチェック状態は保持しない?
            ,name: "send_mail"
            ,disp_name: "メール"
            ,icon_img_src: "/images/icon-mail.png"
            ,title: "ブックマークしたページを設定で指定したメールアドレスに送信する場合はチェックを入れてください。"
        }
        if ( user.plususer ) {
            model.sendMail.available = true;
            model.sendMail.viewIds.push(
                    initTemplatedListItemExpanded( $templateElemEx, info ) );
        }

        $templateElemEx.remove();
        $templateElemMin.remove();

        makeViewCorrespondToModel();
    }
    //$(document).bind( "ready", initSharingOption );
    //    <button id="checkbox-options-button-to-expand">開く</button>
    //    <button id="checkbox-options-button-to-minimize">開く</button>
}).call( this );
