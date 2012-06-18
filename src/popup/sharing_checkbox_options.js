/**
 * ブックマーク追加の際の "共有" に関するオプションのチェックボックスの
 * 動作に関する JavaScript コード
 */
(function namespace() {
    var sharing_target_items = [
        {
             id: "post-twitter"
            ,name: "post_twitter"
            ,disp_name: "Twitter"
            ,icon_img_src: "/images/add-twitter.png"
            ,title: "ブックマークしたページを Twitter へ投稿する場合はチェックを入れてください。"
        }
        ,{
             id: "post-evernote"
            ,name: "post_evernote"
            ,disp_name: "Evernote"
            ,icon_img_src: "/images/icon-facebook.png"
            ,title: "ブックマークしたページを Evernote へ投稿する場合はチェックを入れてください。"
        }
        ,{
             id: "post-facebook"
            ,name: "post_facebook"
            ,disp_name: "Facebook"
            ,icon_img_src: "/images/icon-facebook.png"
            ,title: "ブックマークしたページを Facebook へ投稿する場合はチェックを入れてください。"
        }
        ,{
             id: "post-mixi-check"
            ,name: "post_mixi_check"
            ,disp_name: "Mixi チェック"
            ,icon_img_src: "/images/icon-mixi.png"
            ,title: "ブックマークしたページを Mixi チェックへ投稿する場合はチェックを入れてください。"
        }
    ];
    function expandSharingOptions( evt ) {
        $("#checkbox-options").addClass( "expanded" );
    }
    function minimizeSharingOptions( evt ) {
        $("#checkbox-options").removeClass( "expanded" );
    }
    function initTemplatedListItemExpanded( $templateElem, itemInfo ) {
        var $cloned = $templateElem.clone();
        var img = new Image();
        img.src = itemInfo["icon_img_src"];
        $cloned.find( ".icon-img" ).replaceWith( img );
        $cloned.find( "label" ).prop( "title", itemInfo["title"] );
        $cloned.find( "input" ).prop( "name", itemInfo["name"] );
        $cloned.find( "input" ).prop( "id", itemInfo["id"] );
        $cloned.find( ".displayed-name" ).text( itemInfo["disp_name"] );
        $cloned.insertBefore( $templateElem );
    }
    function initTemplatedListItemMinimized( $templateElem, itemInfo ) {
        var $cloned = $templateElem.clone();
        var img = new Image();
        img.src = itemInfo["icon_img_src"];
        $cloned.find( ".icon-img" ).replaceWith( img );
        $cloned.find( "label" ).prop( "title", itemInfo["title"] );
        $cloned.find( "input" ).prop( "name", itemInfo["name"] + "-minimized" );
        $cloned.find( "input" ).prop( "id", itemInfo["id"] + "-minimized" );
        $cloned.insertBefore( $templateElem );
    }
    function initSharingOption() {
        $("#checkbox-options-button-to-expand").bind( "click", expandSharingOptions );
        $("#checkbox-options-button-to-minimize").bind( "click", minimizeSharingOptions );
        // 初期化
        var templateElem = $("#checkbox-options-expanded-item-template");
        var parentElem = templateElem.parent();
        var i, len;
        for ( i = 0, len = sharing_target_items.length; i < len; ++ i ) {
            initTemplatedListItemExpanded( templateElem, sharing_target_items[i] );
        }
        templateElem.remove();
        // 初期化
        templateElem.remove();
        var templateElem = $("#checkbox-options-minimized-item-template");
        var parentElem = templateElem.parent();
        var i, len;
        for ( i = 0, len = sharing_target_items.length; i < len; ++ i ) {
            initTemplatedListItemMinimized( templateElem, sharing_target_items[i] );
        }
        templateElem.remove();
    }
    $(document).bind( "ready", initSharingOption );
    //    <button id="checkbox-options-button-to-expand">開く</button>
    //    <button id="checkbox-options-button-to-minimize">開く</button>
}).call( this );
