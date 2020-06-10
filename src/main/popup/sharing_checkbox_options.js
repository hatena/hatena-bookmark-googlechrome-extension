/**
 * ブックマーク追加の際の "共有" に関するオプションのチェックボックスの
 * 動作に関する JavaScript コード
 */
var sharingOptions = {};
(function namespace() {
    var model;
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
    function initTemplatedListItemMinimized( $templateElem, itemInfo ) {
        var $cloned = $templateElem.clone();
        $cloned.attr( "id", null );
        var img = new Image();
        img.src = itemInfo["icon_img_src"];
        $cloned.find( ".icon-img" ).replaceWith( img );
        $cloned.find( "label" ).prop( "title", itemInfo["title"] );
        var $inputElem = $cloned.find( "input" );
        var id = itemInfo["id"] + "-minimized";
        $inputElem.prop( "name", itemInfo["name"] );
        $inputElem.prop( "id", id );
        $inputElem.attr( "tabindex", 11 );
        $inputElem.bind( "change", onViewStateChange );
        $inputElem.data( "modelId", itemInfo["modelId"] );
        $cloned.find( ".displayed-name" ).text( itemInfo["disp_name"] );
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
        makeViewCorrespondToModel();
    }
    sharingOptions.initSharingOptions = initSharingOptions;
    function initSharingOptions( user, bookmarkView ) {
        // model 生成
        model = {};
        var info;

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
                initTemplatedListItemMinimized( $templateElemMin, info ) );

        $templateElemMin.remove();

        makeViewCorrespondToModel();
    }
    //$(document).bind( "ready", initSharingOption );
    //    <button id="checkbox-options-button-to-expand">開く</button>
    //    <button id="checkbox-options-button-to-minimize">開く</button>
}).call( this );
