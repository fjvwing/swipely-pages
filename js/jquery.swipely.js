/**
 * Swipley
 *
 * Kudos-time:
 * Adapted from  https://github.com/torkiljohnsen/swipe
 * 
 * Dual licensed under the MIT and GPL licenses
 */

(function($){
    var Swipeable = function(element, fixed, options)
    {
        var NEXT_CONST  = 'yyyNextyyy';
        var PREV_CONST  = 'yyyPrevyyy';
        var NAV_CONST   = 'yyyNavyyy';
        var ABORT_CONST = 'yyyAbortyyy';
        
        var plugin      = this;
        var page        = $(element);   // The main, touch-enabled layer
        var nav         = $(fixed);     // The fixed layer
        var defaults = {
            animationSpeed      : 150,           // speed of the transition
            easing              : 'swing',       // easing function. jQuery only supports 'linear' and 'swing'. Need to use jQuery UI to get others.
            minSwipeLength      : 20,            // amount of pixels to register a swipe
            slideRightSelector  : '#slideRight', // button selector
            slideLeftSelector   : '#slideLeft',  // button selector
        };

        plugin.config = {};

        var init = function() {
            plugin.config = $.extend(defaults, options || {});
            plugin.state  = {
                touchesCount            : 0,         // number of fingers that are touching
                startTouchXPosition     : 0,         // initial start location  x
                startTouchYPosition     : 0,         // initial start location  x
                deltaX                  : 0,         // horizontal movement
                elementPosition         : undefined, // element position before the swipe
                currentXTouchPosition   : 0,
                currentYTouchPosition   : 0,
                isScrolling             : undefined,
            };
            if (document.body.clientWidth > 480) {
                initManyPanels();
            } else {
                initOnePanel();
            }
        };
        
        var initManyPanels = function() {
            var PANEL_CONST         = "panel";
            
            var panel_width = Math.min(800, $(document).width());
            var width = 0;
            var linksMap = {};
            
            nav.find("ul a").each(function(index) {
                var href            = undefined;
                var clickFunction   = undefined;
                var panel           = undefined;
                
                linksMap["index.html"] = function(event) {
                            event.preventDefault();
                            movePage(NAV_CONST);
                    }; 
                panel = $("<div class='panel' id='" + PANEL_CONST +index + "'></div>")
                            .appendTo(page)
                            .css("width", panel_width)
                            .css("left", width);
                width += panel.outerWidth();
                href = $(this).attr('href');
                $.get(href,
                    function( html ) {
                        var $html = $(html);
                        $(panel).html($html);
                        replaceLinks($html, linksMap);
                    }
                );
                clickFunction = function(event) {
                            event.preventDefault();
                            movePage('#' + PANEL_CONST +index);
                    };                
                $(this).on({ 'click': clickFunction });
                linksMap[href] = clickFunction;
                
            });
            page.css("width", width);
            movePage(NAV_CONST);
            attach(page);

        }
        
        var initOnePanel = function() {
            var PANEL_CONST = "panel";
            
            var width = 0;
            var linksMap        = {};
            var panel           = undefined;
                
            panel = $("<div class='panel' id='" + PANEL_CONST + "'>")
                            .appendTo(page)
                            .css("width", $(document).width())
                            .css("left", 0)
                            .css("height", $(document).height());
            width += panel.outerWidth();

            nav.find("ul a").each(function(index) {
                var href            = undefined;
                var clickFunction   = undefined;
                
                linksMap["index.html"] = function(event) {
                            event.preventDefault();
                            movePage(NAV_CONST);
                    }; 
                
                href = $(this).attr('href');
                clickFunction = function(event) {
                            event.preventDefault();
                            $(panel).html("<p>loading…</p>");
                            $.get(href,
                                function( html ) {
                                    $(panel).scrollTop(0);
                                    var $html = $(html);
                                    $(panel).html($html);
                                    replaceLinks($html, linksMap);
                                    if(navigator.userAgent.match(/Android/i)){
                                        window.scrollTo(0,1);
                                    }
                                });
                            movePage('#' + PANEL_CONST);
                            
                        };                
                $(this).on({ 'click': clickFunction });
                linksMap[href] = clickFunction;
                
            });
            page.css("width", width);
            movePage(NAV_CONST);
            attach(page);
            var hrf = $(nav.find("ul a")[0]).attr('href');
            $.get(hrf,function( html ) {
                        var $html = $(html);
                        $(panel).html($html);
                        replaceLinks($html, linksMap);
                        movePage('#' + PANEL_CONST);
                        if(navigator.userAgent.match(/Android/i)){
                            window.scrollTo(0,1);
                        }
                    });
        }

        var attach = function(panel) {
        

            // attach handlers to events
            panel.on({
                'touchstart': function(event) {
                    // http://stackoverflow.com/questions/671498/jquery-live-removing-iphone-touch-event-attributes
                    touchStart(event.originalEvent);
                },
                'touchmove': function(event) {
                    touchMove(event.originalEvent);
                },
                'touchcancel': function(event) {
                    touchCancel(event.originalEvent);
                },
                'touchend': function(event) {
                    touchEnd(event.originalEvent);
                }
            });

            // Windows 8 touch support
            if (window.navigator.msPointerEnabled) {
                panel.on({
                    'MSPointerCancel': function(event) {
                        touchCancel(event.originalEvent);
                    },
                    'MSPointerDown': function(event) {
                        touchStart(event.originalEvent);
                    },
                    'MSPointerMove': function(event) {
                        touchMove(event.originalEvent);
                    },
                    'MSPointerOut': function(event) {
                        touchCancel(event.originalEvent);
                    },
                    'MSPointerUp': function(event) {
                        touchEnd(event.originalEvent);
                    }
                });
            }
            
        };

        var touchStart = function(event) {
            var state = plugin.state;

            // get the total number of fingers touching the screen
            state.touchesCount = event.touches.length;

            // since we're looking for a swipe (single finger) and not a gesture (multiple fingers),
            // check that only one finger was used
            if (state.touchesCount == 1) {
                
                // reset some pr swipe variables
                state.isScrolling         = undefined;
                state.deltaX              = 0;
                state.startTouchXPosition = event.touches[0].pageX;
                state.startTouchYPosition = event.touches[0].pageY;
                                // get the elements current position
                state.elementPosition = page.position().left;
            } else {
                // not one finger touching, so cancel
                touchCancel(event);
            }
        };

        var touchMove = function(event) {
            
            var state   = plugin.state;
            var pagePos = 0;

            // One finger is swiping
            if (state.touchesCount == 1) {

                state.currentXTouchPosition = event.touches[0].pageX;
                state.currentYTouchPosition = event.touches[0].pageY;

                state.deltaX = state.currentXTouchPosition - state.startTouchXPosition;
                var deltaY   = state.currentYTouchPosition - state.startTouchYPosition;

                if (typeof state.isScrolling == 'undefined') {
                    state.isScrolling = !!(state.isScrolling || Math.abs(state.deltaX) < Math.abs(deltaY));
                }
                
                // move the element 
                if (!state.isScrolling) {
                    event.preventDefault();
                    pagePos = state.elementPosition + state.deltaX;
                    
                    // let the page follow the finger
                    page.css('left', pagePos); 
                } 
            } else {
                // not one finger touching, so cancel
                touchCancel(event);
            }
        };

        var touchEnd = function(event) {

            var state = plugin.state;

            // Check that we aren't scrolling and that we have X-axis movement with one finger touching
            if (!state.isScrolling && state.deltaX != 0 && state.touchesCount == 1 && state.currentXTouchPosition != 0) {
                if (Math.abs(state.deltaX) > defaults.minSwipeLength) {
                    // Snap page into new position
                    if (state.deltaX > 0) {
                        movePage(PREV_CONST);
                    } else {
                        movePage(NEXT_CONST);
                    }
                } else {
                    // Swipe too short, snap back to start position
                    movePage(ABORT_CONST);
                }

            } else {
                touchCancel(event);
            }

        };

        var touchCancel = function(event) {

            state = plugin.state;

            if (state.elementPosition != state.currentXTouchPosition) {
                movePage(ABORT_CONST);
            }

            state = $.extend(state, {
                currentXTouchPosition   : 0,
                currentYTouchPosition   : 0
            });

        };

        var movePage = function(direction) {
            // 4 states to move
            // 'next'   next panel if there is one
            // 'prev'   previous panel is there is one
            // 'nav'    navigation panel
            // 'abort'   move back to panel where touch started
            
            var panels = $('div.panel');
            var leftMostBoundaryLeftPanel = undefined;
            var leftMostBoundaryRightPanel = undefined;
            var offset = $(page).offset().left;
            
            if (offset > 0) {   // already showing panel0 and nav
                leftMostBoundaryRightPanel = $(panels)[0];
            } else {
                for (var i = 0; i < panels.length; i++) {
                    offset += $(panels[i]).outerWidth();
                    if (offset > 10) {
                        leftMostBoundaryLeftPanel = panels[i];
                        leftMostBoundaryRightPanel = panels[i+1];
                        break;
                    }
                }
            }
            
            switch (direction) {
            case PREV_CONST:
                if (typeof leftMostBoundaryLeftPanel != 'undefined') {
                    snapToPosition(page, -1 * $(leftMostBoundaryLeftPanel).position().left );
                    break;
                }
            case NAV_CONST:
                snapToPosition(page, nav.outerWidth() + nav.position().left);
                break;  // go to 0
            case NEXT_CONST:
                if (typeof leftMostBoundaryRightPanel != 'undefined') {
                    snapToPosition(page, -1 * $(leftMostBoundaryRightPanel).position().left);
                }
                break;
            case ABORT_CONST:
                snapToPosition(page, plugin.state.elementPosition);
                break;
            default:
                leftMostBoundaryLeftPanel = $(direction);
                if (typeof leftMostBoundaryLeftPanel != 'undefined') {
                    snapToPosition(page, -1 *    $(leftMostBoundaryLeftPanel).position().left);
                }
            }

        };
        

        var snapToPosition = function(layer, endPosition) {
            // Animate the snap
            return page.animate({left:endPosition}, plugin.config.animationSpeed, plugin.config.easing, function() {
                plugin.state.elementPosition = endPosition;
            });
        };
        
        var replaceLinks = function(fragment, map) {
            $.each(map, function(link, clickF) {
                var links = $(fragment).find('a[href="' + link + '"]');
                links.on({ 'click': clickF });
            });
        };

        init();
    };

    $.fn.swipeable = function(fixed, options)
    {
        return this.each(function() {
           var element = $(this);
          
           // Return early if this element already has a plugin instance
           if (element.data('swipeable')) return;

           // pass options to plugin constructor
           var swipeable = new Swipeable(this, fixed, options);

           // Store plugin object in this element's data
           element.data('swipeable', swipeable);
        });
    };
})(jQuery);