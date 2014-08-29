(function() {
  var DB, KDEventEmitter, after, broadcast, connect, connectToChannel, connectToPeer, connectToPeers, connectedPeers, db, every, peer, peerid, peers, publicChannel,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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

  peers = {};

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

    DB.prototype.set = function(conn, data) {
      Db.messages.push({
        peer: conn.peer,
        msg: data,
        at: this.utcTime(),
        dt: conn.dt
      });
      broadcast(msg);
      return this.updateView();
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

  db = new DB;

  window.db = db;

  db.on("update", function(data) {
    return console.log(data);
  });

  after = function(t, fn) {
    return setTimeout(fn, t * 1000);
  };

  every = function(t, fn) {
    return setInterval(fn, t * 1000);
  };

  broadcast = function(msg) {
    var _peer, _peerid, _results;
    _results = [];
    for (_peerid in connectedPeers) {
      _peer = connectedPeers[_peerid];
      if (_peer.send) {
        _results.push(_peer.send(msg));
      }
    }
    return _results;
  };

  connectToChannel = function() {
    var a;
    return a = connectToPeer(window.location.href);
  };

  connectToPeer = function(requestedPeer) {
    var c;
    if (!connectedPeers[requestedPeer]) {
      c = peer.connect(requestedPeer, {
        label: "chat",
        serialization: "none",
        metadata: {
          message: "hi i want to chat with you!"
        }
      });
      c.on("open", function() {
        return connect(c, requestedPeer);
      });
      c.on("error", function(err) {
        return alert(err);
      });
    }
    return connectedPeers[requestedPeer] = 1;
  };

  connectToPeers = function(peers) {
    var p, _i, _len, _results;
    console.log("peers", $.cookie("peers"));
    peers || (peers = $.cookie("peers").split(","));
    _results = [];
    for (_i = 0, _len = peers.length; _i < _len; _i++) {
      p = peers[_i];
      console.log("connecting to:", p);
      _results.push(connectToPeer(p));
    }
    return _results;
  };

  connect = function(c) {
    c.on("data", function(data) {
      console.log(data);
      return db.set(c, data);
    });
    c.on("close", function() {
      console.log("" + c.peer + " has left the chat.");
      if ($(".connection").length === 0) {
        $(".filler").show();
      }
      return delete connectedPeers[c.peer];
    });
    return connectedPeers[c.peer] = c;
  };

  peerid = $.cookie("peerid");

  console.log("-->:", peerid);

  peer = new Peer(peerid, {
    debug: 0,
    host: "localhost",
    port: 9000,
    path: "/peerserver"
  });

  console.log(peer);

  connectedPeers = {};

  peer.on("open", function(id) {
    return $("#pid").text("hi " + id + "! you are in room:" + window.location.pathname);
  });

  peer.on("connection", connect);

  peer.on("error", function(err) {
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

  peer.on("close", function() {
    return console.log("connection closed...");
  });

  peer.on("disconnect", function() {
    return console.log("i am disconnected...");
  });

  window.publicChannel = publicChannel = null;

  $(document).ready(function() {
    var chatbox, doNothing, header;
    console.log("-->:", peerid, $.cookie("peerid"));
    chatbox = $("<div></div>").addClass("connection").addClass("active").attr("id", "general");
    header = $("<h1></h1>").html("Chat with <strong>Public</strong>");
    window.publicChannel = publicChannel = $("<div><em>You are connected.</em></div>").addClass("messages");
    chatbox.append(header);
    chatbox.append(publicChannel);
    $(".filler").hide();
    $("#connections").append(chatbox);
    $("#text").html("{'a':1,'b':{'c':3}}");
    connectToPeers();
    doNothing = function(e) {
      e.preventDefault();
      return e.stopPropagation();
    };
    $("#connect").click(function() {
      return connectToPeer($("#rid").val());
    });
    $("#close").click(function() {
      return eachActiveConnection(function(c) {
        return c.close();
      });
    });
    $("#send").submit(function(e) {
      var msg;
      e.preventDefault();
      msg = $("#text").val();
      $("#text").focus();
      return db.set({
        peer: peerid,
        dt: db.utcTime()
      }, msg);
    });
    return $("#browsers").text(navigator.userAgent);
  });

  window.onunload = window.onbeforeunload = function(e) {
    if (!!peer && !peer.destroyed) {
      return peer.destroy();
    }
  };

}).call(this);
