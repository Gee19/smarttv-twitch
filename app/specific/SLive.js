//Variable initialization
var SLive_cursorY = 0;
var SLive_cursorX = 0;
var SLive_dataEnded = false;
var SLive_itemsCount = 0;
var SLive_idObject = {};
var SLive_emptyCellVector = [];
var SLive_loadingData = false;
var SLive_loadingDataTry = 0;
var SLive_loadingDataTryMax = 5;
var SLive_loadingDataTimeout = 3500;
var SLive_itemsCountOffset = 0;
var SLive_ReplacedataEnded = false;
var SLive_MaxOffset = 0;
var SLive_emptyContent = false;
var SLive_Status = false;
var SLive_itemsCountCheck = false;
var SLive_lastData = '';
var SLive_FirstLoad = false;

var SLive_ids = ['sl_thumbdiv', 'sl_img', 'sl_infodiv', 'sl_displayname', 'sl_streamtitle', 'sl_streamgame', 'sl_viwers', 'sl_quality', 'sl_cell', 'slempty_', 's_live_scroll'];
//Variable initialization end

function SLive_init() {
    Main_Go = Main_SLive;
    Search_isSearching = true;
    Main_cleanTopLabel();
    if (SLive_lastData !== Search_data) SLive_Status = false;
    Main_innerHTML('top_bar_user', STR_SEARCH + Main_UnderCenter(STR_LIVE + ' ' + "'" + Search_data + "'"));
    document.body.addEventListener("keydown", SLive_handleKeyDown, false);
    Main_YRst(SLive_cursorY);
    if (SLive_Status) {
        Main_ShowElement(SLive_ids[10]);
        Main_CounterDialog(SLive_cursorX, SLive_cursorY, Main_ColoumnsCountVideo, SLive_itemsCount);
    } else SLive_StartLoad();
}

function SLive_exit() {
    Main_RestoreTopLabel();
    document.body.removeEventListener("keydown", SLive_handleKeyDown);
    Main_HideElement(SLive_ids[10]);
}

function SLive_StartLoad() {
    Main_HideElement(SLive_ids[10]);
    Main_showLoadDialog();
    Main_HideWarningDialog();
    SLive_lastData = Search_data;
    SLive_Status = false;
    Main_empty('stream_table_search_live');
    SLive_itemsCountOffset = 0;
    SLive_ReplacedataEnded = false;
    SLive_MaxOffset = 0;
    SLive_idObject = {};
    SLive_emptyCellVector = [];
    SLive_itemsCountCheck = false;
    SLive_FirstLoad = true;
    SLive_itemsCount = 0;
    SLive_cursorX = 0;
    SLive_cursorY = 0;
    SLive_dataEnded = false;
    Main_CounterDialogRst();
    SLive_loadDataPrepare();
    SLive_loadDataRequest();
}

function SLive_loadDataPrepare() {
    Main_imgVectorRst();
    SLive_loadingData = true;
    SLive_loadingDataTry = 0;
    SLive_loadingDataTimeout = 3500;
}

function SLive_loadDataRequest() {
    try {

        var xmlHttp = new XMLHttpRequest();

        var offset = SLive_itemsCount + SLive_itemsCountOffset;
        if (offset && offset > (SLive_MaxOffset - 1)) {
            offset = SLive_MaxOffset - Main_ItemsLimitVideo;
            SLive_dataEnded = true;
            SLive_ReplacedataEnded = true;
        }

        xmlHttp.open("GET", 'https://api.twitch.tv/kraken/search/streams?query=' + encodeURIComponent(Search_data) +
            '&limit=' + Main_ItemsLimitVideo + '&offset=' + offset + '&' + Math.round(Math.random() * 1e7), true);
        xmlHttp.timeout = SLive_loadingDataTimeout;
        xmlHttp.setRequestHeader(Main_clientIdHeader, Main_clientId);
        xmlHttp.ontimeout = function() {};

        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState === 4) {
                if (xmlHttp.status === 200) {
                    SLive_loadDataSuccess(xmlHttp.responseText);
                    return;
                } else {
                    SLive_loadDataError();
                }
            }
        };

        xmlHttp.send(null);
    } catch (e) {
        SLive_loadDataError();
    }
}

function SLive_loadDataError() {
    SLive_loadingDataTry++;
    if (SLive_loadingDataTry < SLive_loadingDataTryMax) {
        SLive_loadingDataTimeout += 500;
        SLive_loadDataRequest();
    } else {
        SLive_loadingData = false;
        Main_HideLoadDialog();
        Main_showWarningDialog(STR_REFRESH_PROBLEM);
    }
}

function SLive_loadDataSuccess(responseText) {
    var response = JSON.parse(responseText);
    var response_items = response.streams.length;
    SLive_MaxOffset = parseInt(response._total);

    if (response_items < Main_ItemsLimitVideo) SLive_dataEnded = true;

    var offset_itemsCount = SLive_itemsCount;
    SLive_itemsCount += response_items;

    SLive_emptyContent = !SLive_itemsCount;

    var response_rows = response_items / Main_ColoumnsCountVideo;
    if (response_items % Main_ColoumnsCountVideo > 0) response_rows++;

    var coloumn_id, row_id, row, stream, id,
        cursor = 0;

    for (var i = 0; i < response_rows; i++) {
        row_id = offset_itemsCount / Main_ColoumnsCountVideo + i;
        row = document.createElement('tr');

        for (coloumn_id = 0; coloumn_id < Main_ColoumnsCountVideo && cursor < response_items; coloumn_id++, cursor++) {
            stream = response.streams[cursor];
            id = stream.channel._id;
            if (SLive_idObject[id]) coloumn_id--;
            else {
                SLive_idObject[id] = 1;
                row.appendChild(SLive_createCell(row_id, row_id + '_' + coloumn_id,
                    stream.channel.name, id, [stream.preview.template.replace("{width}x{height}", Main_VideoSize),
                        Main_is_playlist(JSON.stringify(stream.stream_type)) + stream.channel.display_name,
                        stream.channel.status, stream.game,
                        STR_SINCE + Play_streamLiveAt(stream.created_at) + STR_AGO + ', ' +
                        STR_FOR + Main_addCommas(stream.viewers) + STR_VIEWER,
                        Main_videoqualitylang(stream.video_height, stream.average_fps, stream.channel.language)
                    ]));
            }
        }

        for (coloumn_id; coloumn_id < Main_ColoumnsCountVideo; coloumn_id++) {
            if (SLive_dataEnded && !SLive_itemsCountCheck) {
                SLive_itemsCountCheck = true;
                SLive_itemsCount = (row_id * Main_ColoumnsCountVideo) + coloumn_id;
            }
            row.appendChild(Main_createEmptyCell(SLive_ids[9] + row_id + '_' + coloumn_id));
            SLive_emptyCellVector.push(SLive_ids[9] + row_id + '_' + coloumn_id);
        }
        document.getElementById("stream_table_search_live").appendChild(row);
    }

    SLive_loadDataSuccessFinish();
}

function SLive_createCell(row_id, cell_id, channel_name, channel_id, valuesArray) {
    if (row_id < Main_ColoumnsCountVideo) Main_PreLoadAImage(valuesArray[0]); //try to pre cache first 3 rows
    return Main_createCellVideo(channel_name + ',' + channel_id, cell_id, SLive_ids, valuesArray);
}

function SLive_loadDataSuccessFinish() {
    Main_ready(function() {
        if (!SLive_Status) {
            Main_HideLoadDialog();
            if (SLive_emptyContent) Main_showWarningDialog(STR_SEARCH_RESULT_EMPTY);
            else {
                SLive_Status = true;
                Main_imgVectorLoad(IMG_404_VIDEO);
                SLive_addFocus();
            }
            Main_ShowElement(SLive_ids[10]);
            SLive_FirstLoad = false;
        } else {
            Main_imgVectorLoad(IMG_404_VIDEO);
            if (SLive_emptyCellVector.length > 0 && !SLive_dataEnded) {
                SLive_loadDataPrepare();
                SLive_loadDataReplace();
                return;
            } else SLive_emptyCellVector = [];
        }
        SLive_loadingData = false;
    });
}

function SLive_loadDataReplace() {
    try {

        var xmlHttp = new XMLHttpRequest();

        Main_SetItemsLimitReplace(SLive_emptyCellVector.length);

        var offset = SLive_itemsCount + SLive_itemsCountOffset;
        if (offset && offset > (SLive_MaxOffset - 1)) {
            offset = SLive_MaxOffset - Main_ItemsLimitReplace;
            SLive_ReplacedataEnded = true;
        }

        xmlHttp.open("GET", 'https://api.twitch.tv/kraken/search/streams?query=' + encodeURIComponent(Search_data) +
            '&limit=' + Main_ItemsLimitReplace + '&offset=' + offset + '&' + Math.round(Math.random() * 1e7), true);
        xmlHttp.timeout = SLive_loadingDataTimeout;
        xmlHttp.setRequestHeader(Main_clientIdHeader, 'anwtqukxvrtwxb4flazs2lqlabe3hqv');
        xmlHttp.ontimeout = function() {};

        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState === 4) {
                if (xmlHttp.status === 200) {
                    SLive_loadDataSuccessReplace(xmlHttp.responseText);
                    return;
                }
            }
        };

        xmlHttp.send(null);
    } catch (e) {
        SLive_loadDataErrorReplace();
    }
}

function SLive_loadDataErrorReplace() {
    SLive_loadingDataTry++;
    if (SLive_loadingDataTry < SLive_loadingDataTryMax) {
        SLive_loadingDataTimeout += 500;
        SLive_loadDataReplace();
    } else {
        SLive_ReplacedataEnded = true;
        SLive_emptyCellVector = [];
        SLive_loadDataSuccessFinish();
    }
}

function SLive_loadDataSuccessReplace(responseText) {
    var response = JSON.parse(responseText);
    var response_items = response.streams.length;
    var stream, index, id, cursor = 0;
    var tempVector = SLive_emptyCellVector.slice();

    SLive_MaxOffset = parseInt(response._total);

    if (response_items < Main_ItemsLimitVideo) SLive_ReplacedataEnded = true;

    for (var i = 0; i < SLive_emptyCellVector.length && cursor < response_items; i++, cursor++) {
        stream = response.streams[cursor];
        id = stream.channel._id;
        if (SLive_idObject[id]) i--;
        else {
            SLive_idObject[id] = 1;
            Main_replaceVideo(Live_emptyCellVector[i], stream.channel.name + ',' + id, [stream.preview.template.replace("{width}x{height}", Main_VideoSize),
                Main_is_playlist(JSON.stringify(stream.stream_type)) + stream.channel.display_name,
                stream.channel.status, stream.game,
                STR_SINCE + Play_streamLiveAt(stream.created_at) + STR_AGO + ', ' + STR_FOR + Main_addCommas(stream.viewers) + STR_VIEWER,
                Main_videoqualitylang(stream.video_height, stream.average_fps, stream.channel.language)
            ], SLive_ids);

            index = tempVector.indexOf(tempVector[i]);
            if (index > -1) tempVector.splice(index, 1);
        }
    }

    SLive_itemsCountOffset += cursor;
    if (SLive_ReplacedataEnded) SLive_emptyCellVector = [];
    else SLive_emptyCellVector = tempVector;

    SLive_loadDataSuccessFinish();
}

function SLive_addFocus() {
    Main_addFocusVideo(SLive_cursorY, SLive_cursorX, SLive_ids, Main_ColoumnsCountVideo, SLive_itemsCount);

    if (((SLive_cursorY + Main_ItemsReloadLimitVideo) > (SLive_itemsCount / Main_ColoumnsCountVideo)) &&
        !SLive_dataEnded && !SLive_loadingData) {
        SLive_loadDataPrepare();
        SLive_loadDataRequest();
    }
}

function SLive_removeFocus() {
    Main_removeFocus(SLive_cursorY + '_' + SLive_cursorX, SLive_ids);
}

function SLive_handleKeyDown(event) {
    if (SLive_FirstLoad || Main_CantClick()) return;
    else Main_keyClickDelayStart();
    var i;

    switch (event.keyCode) {
        case KEY_RETURN:
            if (Main_isAboutDialogShown()) Main_HideAboutDialog();
            else if (Main_isControlsDialogShown()) Main_HideControlsDialog();
            else {
                if (Main_Go === Main_BeforeSearch) Main_Go = Main_Live;
                else Main_Go = Main_BeforeSearch;
                SLive_exit();
                Search_isSearching = false;
                Main_SwitchScreen();
            }
            break;
        case KEY_LEFT:
            if (Main_ThumbNull((SLive_cursorY), (SLive_cursorX - 1), SLive_ids[0])) {
                SLive_removeFocus();
                SLive_cursorX--;
                SLive_addFocus();
            } else {
                for (i = (Main_ColoumnsCountVideo - 1); i > -1; i--) {
                    if (Main_ThumbNull((SLive_cursorY - 1), i, SLive_ids[0])) {
                        SLive_removeFocus();
                        SLive_cursorY--;
                        SLive_cursorX = i;
                        SLive_addFocus();
                        break;
                    }
                }
            }
            break;
        case KEY_RIGHT:
            if (Main_ThumbNull((SLive_cursorY), (SLive_cursorX + 1), SLive_ids[0])) {
                SLive_removeFocus();
                SLive_cursorX++;
                SLive_addFocus();
            } else if (Main_ThumbNull((SLive_cursorY + 1), 0, SLive_ids[0])) {
                SLive_removeFocus();
                SLive_cursorY++;
                SLive_cursorX = 0;
                SLive_addFocus();
            }
            break;
        case KEY_UP:
            for (i = 0; i < Main_ColoumnsCountVideo; i++) {
                if (Main_ThumbNull((SLive_cursorY - 1), (SLive_cursorX - i), SLive_ids[0])) {
                    SLive_removeFocus();
                    SLive_cursorY--;
                    SLive_cursorX = SLive_cursorX - i;
                    SLive_addFocus();
                    break;
                }
            }
            break;
        case KEY_DOWN:
            for (i = 0; i < Main_ColoumnsCountVideo; i++) {
                if (Main_ThumbNull((SLive_cursorY + 1), (SLive_cursorX - i), SLive_ids[0])) {
                    SLive_removeFocus();
                    SLive_cursorY++;
                    SLive_cursorX = SLive_cursorX - i;
                    SLive_addFocus();
                    break;
                }
            }
            break;
        case KEY_INFO:
        case KEY_CHANNELGUIDE:
            SLive_StartLoad();
            break;
        case KEY_PLAY:
        case KEY_PAUSE:
        case KEY_PLAYPAUSE:
        case KEY_ENTER:
            Play_selectedChannel = document.getElementById(SLive_ids[8] + SLive_cursorY + '_' + SLive_cursorX).getAttribute(Main_DataAttribute).split(',');
            Main_selectedChannel_id = Play_selectedChannel[1];
            Play_selectedChannel = Play_selectedChannel[0];
            Play_selectedChannelDisplayname = document.getElementById(SLive_ids[3] + SLive_cursorY + '_' + SLive_cursorX).textContent;
            document.body.removeEventListener("keydown", SLive_handleKeyDown);
            Main_openStream();
            break;
        case KEY_RED:
            Main_showAboutDialog();
            break;
        case KEY_GREEN:
            SLive_exit();
            Search_isSearching = false;
            Main_GoLive();
            break;
        case KEY_YELLOW:
            Main_showControlsDialog();
            break;
        case KEY_BLUE:
            Main_Go = Main_Search;
            SLive_exit();
            Main_SwitchScreen();
            break;
        default:
            break;
    }
}