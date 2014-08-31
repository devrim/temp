(function() {
  var DB, KDEventEmitter, MY_ID, P2P, after, browserEvents, every, i, log, p2p, publicChannel, warn,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  log = console.log.bind(console);

  warn = console.warn.bind(console);

  MY_ID = null;

  browserEvents = ["abort", "afterprint", "beforeprint", "beforeunload", "blur", "canplay", "canplaythrough", "change", "click", "contextmenu", "copy", "cuechange", "cut", "dblclick", "DOMContentLoaded", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop", "durationchange", "emptied", "ended", "error", "focus", "focusin", "focusout", "formchange", "forminput", "hashchange", "input", "invalid", "keydown", "keypress", "keyup", "load", "loadeddata", "loadedmetadata", "loadstart", "message", "mousedown", "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "mousewheel", "offline", "online", "pagehide", "pageshow", "paste", "pause", "play", "playing", "popstate", "progress", "ratechange", "readystatechange", "redo", "reset", "resize", "scroll", "seeked", "seeking", "select", "show", "stalled", "storage", "submit", "suspend", "timeupdate", "undo", "unload", "volumechange", "waiting"];

  i = 0;

  KDEventEmitter = (function() {
    var _off, _on, _registerEvent, _unregisterEvent;

    KDEventEmitter.registerStaticEmitter = function() {
      return this._e = {};
    };

    _registerEvent = function(registry, eventName, listener) {
      if (registry[eventName] == null) {
        registry[eventName] = [];
      }
      return registry[eventName].push(listener);
    };

    _unregisterEvent = function(registry, eventName, listener) {
      var cbIndex;
      if (!eventName || eventName === "*") {
        return registry = {};
      } else if (listener && registry[eventName]) {
        cbIndex = registry[eventName].indexOf(listener);
        if (cbIndex >= 0) {
          return registry[eventName].splice(cbIndex, 1);
        }
      } else {
        return registry[eventName] = [];
      }
    };

    _on = function(registry, eventName, listener) {
      var name, _i, _len, _results;
      if (eventName == null) {
        throw new Error('Try passing an event, genius!');
      }
      if (listener == null) {
        throw new Error('Try passing a listener, genius!');
      }
      if (Array.isArray(eventName)) {
        _results = [];
        for (_i = 0, _len = eventName.length; _i < _len; _i++) {
          name = eventName[_i];
          _results.push(_registerEvent(registry, name, listener));
        }
        return _results;
      } else {
        return _registerEvent(registry, eventName, listener);
      }
    };

    _off = function(registry, eventName, listener) {
      var name, _i, _len, _results;
      if (Array.isArray(eventName)) {
        _results = [];
        for (_i = 0, _len = eventName.length; _i < _len; _i++) {
          name = eventName[_i];
          _results.push(_unregisterEvent(registry, name, listener));
        }
        return _results;
      } else {
        return _unregisterEvent(registry, eventName, listener);
      }
    };

    KDEventEmitter.emit = function() {
      var args, eventName, listener, listeners, _base, _i, _len;
      if (this._e == null) {
        throw new Error('Static events are not enabled for this constructor.');
      }
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      listeners = (_base = this._e)[eventName] != null ? _base[eventName] : _base[eventName] = [];
      for (_i = 0, _len = listeners.length; _i < _len; _i++) {
        listener = listeners[_i];
        listener.apply(null, args);
      }
      return this;
    };

    KDEventEmitter.on = function(eventName, listener) {
      if ('function' !== typeof listener) {
        throw new Error('listener is not a function');
      }
      if (this._e == null) {
        throw new Error('Static events are not enabled for this constructor.');
      }
      this.emit('newListener', listener);
      _on(this._e, eventName, listener);
      return this;
    };

    KDEventEmitter.off = function(eventName, listener) {
      this.emit('listenerRemoved', eventName, listener);
      _off(this._e, eventName, listener);
      return this;
    };

    function KDEventEmitter(options) {
      var maxListeners;
      if (options == null) {
        options = {};
      }
      maxListeners = options.maxListeners;
      this._e = {};
      this._maxListeners = maxListeners > 0 ? maxListeners : 10;
    }

    KDEventEmitter.prototype.emit = function() {
      var args, eventName, listenerStack, _base;
      eventName = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if ((_base = this._e)[eventName] == null) {
        _base[eventName] = [];
      }
      listenerStack = [];
      listenerStack = listenerStack.concat(this._e[eventName].slice(0));
      listenerStack.forEach((function(_this) {
        return function(listener) {
          return listener.apply(_this, args);
        };
      })(this));
      return this;
    };

    KDEventEmitter.prototype.on = function(eventName, listener) {
      if ('function' !== typeof listener) {
        throw new Error('listener is not a function');
      }
      this.emit('newListener', eventName, listener);
      _on(this._e, eventName, listener);
      return this;
    };

    KDEventEmitter.prototype.off = function(eventName, listener) {
      this.emit('listenerRemoved', eventName, listener);
      _off(this._e, eventName, listener);
      return this;
    };

    KDEventEmitter.prototype.once = function(eventName, listener) {
      var _listener;
      _listener = (function(_this) {
        return function() {
          var args;
          args = [].slice.call(arguments);
          _this.off(eventName, _listener);
          return listener.apply(_this, args);
        };
      })(this);
      this.on(eventName, _listener);
      return this;
    };

    return KDEventEmitter;

  })();

  DB = (function(_super) {
    var Db, mergeRecursive;

    __extends(DB, _super);

    function DB() {
      return DB.__super__.constructor.apply(this, arguments);
    }

    Db = {
      strings: [],
      objects: [],
      arrays: [],
      messages: []
    };

    mergeRecursive = function(obj1, obj2) {
      var e, p;
      for (p in obj2) {
        try {
          if (obj2[p].constructor === Object) {
            obj1[p] = mergeRecursive(obj1[p], obj2[p]);
          } else {
            obj1[p] = obj2[p];
          }
        } catch (_error) {
          e = _error;
          obj1[p] = obj2[p];
        }
      }
      return obj1;
    };

    DB.prototype.utcTime = function() {
      var now;
      now = new Date;
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    };

    DB.prototype.set = function(meta, data) {
      var obj;
      obj = {
        peer: meta.peer || p2p.peerid,
        data: data,
        dept: meta.dept || this.utcTime(),
        arrv: meta.arrv || this.utcTime(),
        path: meta.path || window.location.pathname
      };
      Db.messages.push(obj);
      this.updateView();
      return obj;
    };

    DB.prototype.all = function() {
      return JSON.stringify(Db, null, 2);
    };

    DB.prototype.updateView = function(div) {
      var scrollDown;
      scrollDown = function() {
        var a;
        a = document.getElementById("general");
        return a.scrollTop = a.scrollHeight;
      };
      scrollDown();
      return $("#general").html("<div><pre><code class='javascript'>" + this.all() + "</pre></code></div>");
    };

    return DB;

  })(KDEventEmitter);

  P2P = (function() {
    var broadcastCount, connectedPeers, lastBroadcast;

    connectedPeers = {};

    function P2P(options, callback) {
      this.db = new DB;
      this.peerid = null;
      this.peer = null;
      this.peers = {};
      this.throttledBroadcast = _.throttle(this.broadcast, 50);
      this.db.on("update", function(data) {
        return console.log(data);
      });
    }

    P2P.prototype.join = function(options, callback) {
      this.peer = new Peer({
        debug: 0,
        host: window.location.hostname,
        port: window.location.port,
        path: "/-/ps",
        allow_discovery: true
      });
      console.log(this.peer);
      this.peer.on("open", (function(_this) {
        return function(id) {
          MY_ID = id;
          log({
            MY_ID: MY_ID
          });
          _this.peerid = id;
          $("#pid").text("hi " + id);
          return _this.fetchPeers({}, function(err, peers) {
            console.log("peers:", peers);
            _this.peers = peers;
            return _this.connectToPeers(peers);
          });
        };
      })(this));
      this.peer.on("connection", this.connect);
      this.peer.on("error", function(err) {
        if (err.type === "unavailable-id") {
          console.log("unavailable-id", arguments);
        } else if (err.type === "socket-closed") {
          console.log("||socket-closed||");
        } else if (err.type === "network") {
          console.log("---> going down...");
          after(3, location.reload.bind(location));
        }
        return console.log("--->", err.type);
      });
      this.peer.on("close", function() {
        return console.log("connection closed...");
      });
      return this.peer.on("disconnect", function() {
        return console.log("i am disconnected...");
      });
    };

    P2P.prototype.fetchPeers = function(options, callback) {
      return $.ajax({
        url: "/peers",
        dataType: "json",
        success: function(data) {
          return callback(null, data);
        }
      });
    };

    broadcastCount = 0;

    lastBroadcast = Date.now();

    P2P.prototype.broadcast = function(obj) {
      var _peer, _peerid, _results;
      _results = [];
      for (_peerid in connectedPeers) {
        _peer = connectedPeers[_peerid];
        if (_peer.send && obj.peer !== _peerid) {
          _results.push(_peer.send(JSON.stringify(obj)));
        }
      }
      return _results;
    };

    P2P.prototype.connectToPeer = function(requestedPeer) {
      var c;
      if (!connectedPeers[requestedPeer]) {
        c = this.peer.connect(requestedPeer, {
          label: "chat",
          serialization: "json",
          metadata: {
            message: "hi i want to chat with you!"
          }
        });
        c.on("open", (function(_this) {
          return function() {
            return _this.connect(c, requestedPeer);
          };
        })(this));
        c.on("error", function(err) {
          return alert(err);
        });
      }
      return connectedPeers[requestedPeer] = 1;
    };

    P2P.prototype.connectToPeers = function(peers) {
      var info, peer, _ref, _results;
      console.log("connecting to:", peers);
      _ref = this.peers;
      _results = [];
      for (peer in _ref) {
        info = _ref[peer];
        console.log("connecting to:", peer);
        _results.push(this.connectToPeer(peer));
      }
      return _results;
    };

    P2P.prototype.connect = function(c) {
      c.on("data", function(msg) {
        var a, clickedElement, obj;
        obj = JSON.parse(msg);
        if (MY_ID === obj.peer) {
          return;
        }
        if (obj.data.type !== "mousemove") {
          console.log("got " + obj.data.type + " from:", obj.peer, "at:", obj.data.pageX, obj.data.pageY);
        }
        if (obj.type === "event") {
          switch (obj.data.type) {
            case "mousemove":
              if (!$(".pointer." + obj.peer).length) {
                $("body").append("<div class='pointer " + obj.peer + "'>" + obj.peer + "</div>");
              }
              return $(".pointer." + obj.peer).css({
                top: obj.data.pageY,
                left: obj.data.pageX
              });
            case "click":
              a = 2;
              clickedElement = document.elementFromPoint(obj.data.pageX, obj.data.pageY);
              $(clickedElement).trigger("click", p2p.peerid);
              return console.log(clickedElement);
            case "focusin":
              a = 2;
              clickedElement = document.elementFromPoint(obj.data.pageX, obj.data.pageY);
              console.log(clickedElement);
              return $(clickedElement).trigger("focus", p2p.peerid);
          }
        } else {
          return this.db.set({
            peer: obj.peer,
            dept: obj.dept,
            arrv: this.db.utcTime(),
            path: obj.path
          }, obj.data);
        }
      });
      c.on("close", function() {
        console.log("" + c.peer + " has left the chat.");
        return delete connectedPeers[c.peer];
      });
      return connectedPeers[c.peer] = c;
    };

    return P2P;

  })();

  p2p = new P2P;

  log({
    MY_ID: MY_ID
  });

  p2p.join();

  after = function(t, fn) {
    return setTimeout(fn, t * 1000);
  };

  every = function(t, fn) {
    return setInterval(fn, t * 1000);
  };

  window.publicChannel = publicChannel = null;

  $(document).ready(function() {
    var chatbox, header;
    chatbox = $("<div></div>").addClass("connection").addClass("active").attr("id", "general");
    header = $("<h1></h1>").html("Chat with <strong>Public</strong>");
    window.publicChannel = publicChannel = $("<div><em>You are connected.</em></div>").addClass("messages");
    chatbox.append(header);
    chatbox.append(publicChannel);
    $(".filler").hide();
    $("#connections").append(chatbox);
    $("#text").html("{'a':1,'b':{'c':3}}");
    p2p.connectToPeers();
    $("#connect").click(function() {
      return connectToPeer($("#rid").val());
    });
    $("#close").click(function() {
      return eachActiveConnection(function(c) {
        return c.close();
      });
    });
    $("#send").submit(function(e) {
      var msg, obj;
      e.preventDefault();
      msg = $("#text").val();
      $("#text").focus();
      obj = p2p.db.set({}, msg);
      return p2p.broadcast(obj);
    });
    return $("#browsers").text(navigator.userAgent);
  });

  window.onunload = window.onbeforeunload = function(e) {
    if (!!peer && !peer.destroyed) {
      return peer.destroy();
    }
  };

}).call(this);
