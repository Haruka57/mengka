$(function () {
    //是否产生新元素
    var isNewRndItem = false;
    var gameScore = 0;
    //最高分
    var maxScore = 0;

    // 撤回栈：保存“有效移动前”的棋盘与分数
    var undoStack = [];
    var UNDO_LIMIT = 50;

    if (localStorage.maxScore) {
        maxScore = localStorage.maxScore - 0;
    } else {
        maxScore = 0;
    }

    //游戏初始化
    gameInit();

    function snapshotState() {
        var items = $('.gameBody .row .item');
        var cells = [];
        for (var i = 0; i < items.length; i++) {
            var $it = items.eq(i);
            cells.push({
                x: $it.attr('x'),
                y: $it.attr('y'),
                v: $it.html()
            });
        }
        return {
            score: gameScore,
            cells: cells
        };
    }

    function restoreState(state) {
        if (!state) return;

        gameScore = state.score;
        $('#gameScore').html(gameScore);

        for (var i = 0; i < state.cells.length; i++) {
            var c = state.cells[i];
            var $it = $('.gameBody .row .x' + c.x + 'y' + c.y);
            if (c.v === '') {
                $it.html('').removeClass('nonEmptyItem').addClass('emptyItem');
            } else {
                $it.html(c.v).removeClass('emptyItem').addClass('nonEmptyItem');
            }
        }

        refreshColor();
        $('#gameOverModal').modal('hide');
    }

    function undoMove() {
        if (undoStack.length === 0) return;
        var prev = undoStack.pop();
        restoreState(prev);
    }

    function refreshGame() {
        undoStack = [];
        var items = $('.gameBody .row .item');
        for (var i = 0; i < items.length; i++) {
            items.eq(i).html('').removeClass('nonEmptyItem').addClass('emptyItem');
        }
        gameScore = 0;
        //分数清零
        $('#gameScore').html(gameScore);
        //随机生成两个新元素
        newRndItem();
        newRndItem();
        //刷新颜色
        refreshColor();
        $('#gameOverModal').modal('hide');
    }

    // 兼容旧的 inline 调用（即使页面上还有 onclick，也不会报错）
    window.refreshGame = refreshGame;
    window.undoMove = undoMove;


    function getSideItem(currentItem, direction) {
        //当前元素的位置
        var currentItemX = currentItem.attr('x') - 0;
        var currentItemY = currentItem.attr('y') - 0;

        //根据方向获取旁边元素的位置
        switch (direction) {
            case 'left':
                var sideItemX = currentItemX;
                var sideItemY = currentItemY - 1;
                break;
            case 'right':
                var sideItemX = currentItemX;
                var sideItemY = currentItemY + 1;
                break;
            case 'up':
                var sideItemX = currentItemX - 1;
                var sideItemY = currentItemY;
                break;
            case 'down':
                var sideItemX = currentItemX + 1;
                var sideItemY = currentItemY;
                break;
        }
        //旁边元素
        var sideItem = $('.gameBody .row .x' + sideItemX + 'y' + sideItemY);
        return sideItem;
    }


    function itemMove(currentItem, direction) {

        var sideItem = getSideItem(currentItem, direction);

        if (sideItem.length == 0) {//当前元素在最边上
            //不动

        } else if (sideItem.html() == '') { //当前元素不在最后一个且左（右、上、下）侧元素是空元素
            sideItem.html(currentItem.html()).removeClass('emptyItem').addClass('nonEmptyItem');
            currentItem.html('').removeClass('nonEmptyItem').addClass('emptyItem');
            itemMove(sideItem, direction);
            isNewRndItem = true;

        } else if (sideItem.html() != currentItem.html()) {//左（右、上、下）侧元素和当前元素内容不同
            //不动

        } else {//左（右、上、下）侧元素和当前元素内容相同
            //向右合并
            sideItem.html((sideItem.html() - 0) * 2);
            currentItem.html('').removeClass('nonEmptyItem').addClass('emptyItem');
            gameScore += (sideItem.text() - 0) * 10;
            $('#gameScore').html(gameScore);
            // itemMove(sideItem, direction);
            maxScore = maxScore < gameScore ? gameScore : maxScore;
            $('#maxScore').html(maxScore);
            localStorage.maxScore = maxScore;
            isNewRndItem = true;
            return;
        }
    }


    function move(direction) {
        //获取所有非空元素
        var nonEmptyItems = $('.gameBody .row .nonEmptyItem');
        //如果按下的方向是左或上，则正向遍历非空元素
        if (direction == 'left' || direction == 'up') {
            for (var i = 0; i < nonEmptyItems.length; i++) {
                var currentItem = nonEmptyItems.eq(i);
                itemMove(currentItem, direction);
            }
        } else if (direction == 'right' || direction == 'down') {//如果按下的方向是右或下，则反向遍历非空元素
            for (var i = nonEmptyItems.length - 1; i >= 0; i--) {
                var currentItem = nonEmptyItems.eq(i);
                itemMove(currentItem, direction);
            }
        }

        //是否产生新元素
        if (isNewRndItem) {
            newRndItem();
            refreshColor();
        }
    }

    function isGameOver() {
        //获取所有元素
        var items = $('.gameBody .row .item');
        //获取所有非空元素
        var nonEmptyItems = $('.gameBody .row .nonEmptyItem');
        if (items.length == nonEmptyItems.length) {//所有元素的个数 == 所有非空元素的个数  即没有空元素
            //遍历所有非空元素
            for (var i = 0; i < nonEmptyItems.length; i++) {
                var currentItem = nonEmptyItems.eq(i);
                if (getSideItem(currentItem, 'up').length != 0 && currentItem.html() == getSideItem(currentItem, 'up').html()) {
                    //上边元素存在 且 当前元素中的内容等于上边元素中的内容
                    return;
                } else if (getSideItem(currentItem, 'down').length != 0 && currentItem.html() == getSideItem(currentItem, 'down').html()) {
                    //下边元素存在 且 当前元素中的内容等于下边元素中的内容
                    return;
                } else if (getSideItem(currentItem, 'left').length != 0 && currentItem.html() == getSideItem(currentItem, 'left').html()) {
                    //左边元素存在 且 当前元素中的内容等于左边元素中的内容
                    return;
                } else if (getSideItem(currentItem, 'right').length != 0 && currentItem.html() == getSideItem(currentItem, 'right').html()) {
                    //右边元素存在 且 当前元素中的内容等于右边元素中的内容
                    return;
                }
            }
        } else {
            return;
        }
        $('#gameOverModal').modal('show');
    }

    //游戏初始化
    function gameInit() {
        //初始化分数
        $('#gameScore').html(gameScore);
        //最大分值
        $('#maxScore').html(maxScore);
        //为刷新按钮绑定事件
        $('.refreshBtn').click(refreshGame);
        $('.undoBtn').click(undoMove);
        //随机生成两个新元素
        newRndItem();
        newRndItem();
        //刷新颜色
        refreshColor();
    }

    //随机生成新元素
    function newRndItem() {
        //随机生成新数字
        var newRndArr = [2, 2, 4];
        var newRndNum = newRndArr[getRandom(0, 2)];
        console.log('newRndNum: ' + newRndNum);
        //随机生成新数字的位置
        var emptyItems = $('.gameBody .row .emptyItem');
        var newRndSite = getRandom(0, emptyItems.length - 1);
        emptyItems.eq(newRndSite).html(newRndNum).removeClass('emptyItem').addClass('nonEmptyItem');
    }

    //产生随机数，包括min、max
    function getRandom(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    //刷新颜色
    function refreshColor() {
        var items = $('.gameBody .item');
        for (var i = 0; i < items.length; i++) {
            var $item = items.eq(i);
            var v = $item.html();

            if (v === '') {
                $item.removeAttr('data-value');
                $item.css({
                    'background-image': 'none',
                    'background-color': '#fff'
                });
                continue;
            }

            // 使用图片贴图（保留 HTML 数字供逻辑判断）
            $item.attr('data-value', v);
            $item.css({
                'background-image': "url('image/" + v + ".png')",
                'background-color': ''
            });
        }
    }

    // 电脑的方向键监听事件
    $('body').keydown(function (e) {
        switch (e.keyCode) {
            case 37:
                // left
                console.log('left');
                var snapL = snapshotState();
                isNewRndItem = false;
                move('left');
                if (isNewRndItem) {
                    undoStack.push(snapL);
                    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                }
                isGameOver();
                break;
            case 38:
                // up
                console.log('up');
                var snapU = snapshotState();
                isNewRndItem = false;
                move('up');
                if (isNewRndItem) {
                    undoStack.push(snapU);
                    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                }
                isGameOver();
                break;
            case 39:
                // right
                console.log('right');
                var snapR = snapshotState();
                isNewRndItem = false;
                move('right');
                if (isNewRndItem) {
                    undoStack.push(snapR);
                    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                }
                isGameOver();
                break;
            case 40:
                // down
                console.log('down');
                var snapD = snapshotState();
                isNewRndItem = false;
                move('down');
                if (isNewRndItem) {
                    undoStack.push(snapD);
                    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
                }
                isGameOver();
                break;
        }
    });

    // 手机屏幕划动触发
    (function () {
        mobilwmtouch(document.getElementById("gameBody"))
        document.getElementById("gameBody").addEventListener('touright', function (e) {
            e.preventDefault();
            // alert("方向向右");
            console.log('right');
            var snapR = snapshotState();
            isNewRndItem = false;
            move('right');
            if (isNewRndItem) {
                undoStack.push(snapR);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
            }
            isGameOver();
        });
        document.getElementById("gameBody").addEventListener('touleft', function (e) {
            // alert("方向向左");
            console.log('left');
            var snapL = snapshotState();
            isNewRndItem = false;
            move('left');
            if (isNewRndItem) {
                undoStack.push(snapL);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
            }
            isGameOver();
        });
        document.getElementById("gameBody").addEventListener('toudown', function (e) {
            // alert("方向向下");
            console.log('down');
            var snapD = snapshotState();
            isNewRndItem = false;
            move('down');
            if (isNewRndItem) {
                undoStack.push(snapD);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
            }
            isGameOver();
        });
        document.getElementById("gameBody").addEventListener('touup', function (e) {
            // alert("方向向上");
            console.log('up');
            var snapU = snapshotState();
            isNewRndItem = false;
            move('up');
            if (isNewRndItem) {
                undoStack.push(snapU);
                if (undoStack.length > UNDO_LIMIT) undoStack.shift();
            }
            isGameOver();
        });

        function mobilwmtouch(obj) {
            var stoux, stouy;
            var etoux, etouy;
            var xdire, ydire;
            obj.addEventListener("touchstart", function (e) {
                stoux = e.targetTouches[0].clientX;
                stouy = e.targetTouches[0].clientY;
                //console.log(stoux);
            }, false);
            obj.addEventListener("touchend", function (e) {
                etoux = e.changedTouches[0].clientX;
                etouy = e.changedTouches[0].clientY;
                xdire = etoux - stoux;
                ydire = etouy - stouy;
                chazhi = Math.abs(xdire) - Math.abs(ydire);
                //console.log(ydire);
                if (xdire > 0 && chazhi > 0) {
                    console.log("right");
                    //alert(evenzc('touright',alerts));
                    obj.dispatchEvent(evenzc('touright'));

                } else if (ydire > 0 && chazhi < 0) {
                    console.log("down");
                    obj.dispatchEvent(evenzc('toudown'));
                } else if (xdire < 0 && chazhi > 0) {
                    console.log("left");
                    obj.dispatchEvent(evenzc('touleft'));
                } else if (ydire < 0 && chazhi < 0) {
                    console.log("up");
                    obj.dispatchEvent(evenzc('touup'));
                }
            }, false);

            function evenzc(eve) {
                if (typeof document.CustomEvent === 'function') {

                    this.event = new document.CustomEvent(eve, {//自定义事件名称
                        bubbles: false,//是否冒泡
                        cancelable: false//是否可以停止捕获
                    });
                    if (!document["evetself" + eve]) {
                        document["evetself" + eve] = this.event;
                    }
                } else if (typeof document.createEvent === 'function') {


                    this.event = document.createEvent('HTMLEvents');
                    this.event.initEvent(eve, false, false);
                    if (!document["evetself" + eve]) {
                        document["evetself" + eve] = this.event;
                    }
                } else {
                    return false;
                }

                return document["evetself" + eve];

            }
        }
    })();
});