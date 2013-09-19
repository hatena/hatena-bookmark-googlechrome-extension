
var Timer = {
    get now() {
        return (new Date).getTime();
    },
    create: function(interval, repeatCount, Global) {
        var currentCount = 0;
        var interval = interval || 60; // ms
        var repeatCount = repeatCount || 0;
        if (!Global) Global = window;
        var _running = false;
        var sid;

        var timer = $({});
        jQuery.extendWithAccessorProperties(timer, {
            start: function() {
                sid = Global.setInterval(function() {
                    timer.loop();
                }, interval);
            },
            reset: function() {
                timer.stop();
                currentCount = 0;
            },
            stop: function() {
                if (sid) Global.clearInterval(sid);
                sid = null;
            },
            get running() { return !!sid },
            loop: function() {
                if (!timer.running) return;

                currentCount++;
                if (repeatCount && currentCount >= repeatCount) {
                    timer.stop();
                    timer.trigger('timer', [currentCount]);
                    timer.trigger('timerComplete', [currentCount]);
                    return;
                }
                timer.trigger('timer', currentCount);
            },
        });
        return timer;
    }
}

