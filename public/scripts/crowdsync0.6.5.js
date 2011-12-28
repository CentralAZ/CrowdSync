
/**
 * CrowdSync version 0.6.5
 * (c) 2011 Central Christian Church - www.centralaz.com
 * CrowdSync may be freely distributed under the MIT license.
 * For all details and documentation head to https://github.com/centralaz/crowdsync
*/

(function() {

  window.CrowdSync = (function() {

    function CrowdSync(options) {
      if (options == null) options = {};
      if (options) this.settings = options;
      this.initSettings(options);
      if (this.settings.useCanvas === false) {
        this.loadNotesFromDom();
      } else {
        this.initCanvas();
      }
      this.initDocument();
    }

    CrowdSync.prototype.initSettings = function(options) {
      this.deltaOffset = Number.MAX_VALUE;
      this.playHeadIndex = 0;
      this.settings.cycleLength = options.cycleLength || 10;
      this.settings.campus = options.campus || 1;
      this.settings.displayLogo = options.displayLogo || false;
      this.settings.displaySplash = options.displaySplash || false;
      this.settings.serverCheckCount = 1;
      this.settings.displayCountDown = options.displayCountDown || true;
      this.settings.countDownLength = options.countDownLength || 30000;
      this.settings.debugging = options.debugging || false;
      this.settings.notes = options.notes || ['a', 'b', 'c', 'd'];
      this.settings.randomizeColor = options.randomizeColor != null ? options.randomizeColor : true;
      this.clientNotes = [];
      this.settings.useCanvas = options.useCanvas || false;
      this.settings.shouldPlayAudio = options.shouldPlayAudio || false;
      this.settings.audioStartOffset = options.audioStartOffset || 0;
      this.settings.audioFileName = options.audioFileName || '';
      if (this.settings.shouldPlayAudio === true) {
        this.audio = new Audio(this.settings.audioFileName);
        this.playingAudio = false;
        return this.testAudio();
      }
    };

    CrowdSync.prototype.testAudio = function() {
      var audioAvailable, request,
        _this = this;
      if (typeof webkitAudioContext === 'undefined') return;
      this.audioContext = new webkitAudioContext();
      this.source = this.audioContext.createBufferSource();
      this.processor = this.audioContext.createJavaScriptNode(2048);
      audioAvailable = function(event) {
        return _this.processor.onaudioprocess = null;
      };
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      request = new XMLHttpRequest();
      request.open('GET', this.settings.audioFileName, true);
      request.responseType = 'arraybuffer';
      request.onload = function() {
        _this.source.buffer = _this.audioContext.createBuffer(request.response, false);
        _this.source.looping = true;
        _this.processor.onaudioprocess = audioAvailable;
        return _this.source.noteOn(0);
      };
      return request.send();
    };

    CrowdSync.prototype.initDocument = function() {
      var note, _i, _len, _ref, _results;
      if (this.settings.displayCountDown === true) {
        $('<div class="count-down"/>').appendTo('body');
      }
      if (this.settings.debugging === true) {
        $('<div id="debug"/>').appendTo('body');
      }
      if (this.settings.displayLogo === true) {
        _ref = this.clientNotes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          note = _ref[_i];
          _results.push($("." + note).addClass("logo-" + note));
        }
        return _results;
      }
    };

    CrowdSync.prototype.loadNotesFromDom = function() {
      var addNote, note, that, _i, _len, _ref, _results;
      addNote = function(note, array) {
        if ($.inArray(note, array) === -1) return array.push(note);
      };
      if (this.settings.randomizeColor === false) {
        _ref = this.settings.notes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          note = _ref[_i];
          if ($('.main-screen').hasClass(note)) {
            addNote(note, this.clientNotes);
            if (this.settings.debugging === false) {
              _results.push($('.main-screen').text(''));
            } else {
              _results.push(void 0);
            }
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      } else {
        that = this;
        return $('.main-screen').removeClass(this.settings.notes.join(' ')).each(function() {
          var i, theNote;
          i = Math.floor(Math.random() * that.settings.notes.length);
          theNote = that.settings.notes[i];
          $(this).addClass(theNote);
          addNote(theNote, that.clientNotes);
          if (that.settings.debugging === true) return $(this).text(theNote);
        });
      }
    };

    CrowdSync.prototype.log = function(message) {
      if (typeof console !== 'undefined' && console.log) {
        return console.log(message);
      }
    };

    CrowdSync.prototype.filterNotes = function() {
      var _this = this;
      this.currentTrack.ticks = $.grep(this.currentTrack.ticks, function(element, index) {
        var hasNotes;
        hasNotes = $.grep(element.notes, function(note, i) {
          var result;
          result = $.inArray(note, _this.clientNotes);
          return result > -1;
        });
        return hasNotes.length > 0;
      });
      if (this.settings.debugging === true) {
        this.log('Filtering out mismatched notes...');
        return this.log(this.currentTrack);
      }
    };

    CrowdSync.prototype.convertToClientTime = function() {
      var _this = this;
      if (this.settings.debugging === true) {
        this.log("Current start time: " + this.currentTrack.startTime);
      }
      this.currentTrack.startTime = this.currentTrack.startTime + this.deltaOffset;
      this.currentTrack.countDownStartTime = this.currentTrack.startTime - this.settings.countDownLength;
      $.each(this.currentTrack.ticks, function(index, value) {
        return value.time += _this.currentTrack.startTime;
      });
      if (this.settings.debugging === true) {
        this.log('Converting relative timecodes to client time...');
        return this.log(this.currentTrack);
      }
    };

    CrowdSync.prototype.formatCountDownTime = function(seconds) {
      var minutes;
      minutes = Math.floor(seconds / 60) % 60;
      seconds = seconds % 60;
      if (minutes > 0) {
        if (seconds.toString().length === 1) seconds = "0" + seconds;
        return "" + minutes + ":" + seconds;
      } else {
        return seconds;
      }
    };

    CrowdSync.prototype.writeTimerInfo = function(delta) {
      var $ul;
      $ul = $('<ul/>');
      $ul.append("<li>Client Time: " + (this.clientTime.getTime()) + "</li>");
      $ul.append("<li>Server Time: " + this.serverTime + "</li>");
      $ul.append("<li>Delta: " + delta + "</li>");
      $ul.append("<li>Min Delta: " + this.deltaOffset + "</li>");
      return $ul.prependTo('#debug');
    };

    CrowdSync.prototype.start = function(count) {
      var _this = this;
      if (this.debugging === true) $('<div id="debug"/>').appendTo('body');
      this.deltaCount = count;
      return this.deltaTimer = setInterval(function() {
        return _this.getDelta();
      }, 500);
    };

    CrowdSync.prototype.getDelta = function() {
      var _this = this;
      return $.ajax({
        url: '/CrowdSync.asmx/GetTime',
        type: 'GET',
        data: '',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: function(result) {
          var delta;
          _this.serverTime = result.d;
          _this.clientTime = new Date();
          delta = _this.clientTime.getTime() - _this.serverTime;
          if (delta < _this.deltaOffset) _this.deltaOffset = delta;
          if (_this.settings.debugging === true) _this.writeTimerInfo(delta);
          if (_this.settings.serverCheckCount++ >= _this.deltaCount) {
            clearTimeout(_this.deltaTimer);
            _this.loadNextTrack();
          }
          return false;
        },
        error: function(result, status, error) {
          clearTimeout(_this.deltaTimer);
          if (_this.settings.debugging === true) _this.log(result.responseText);
          return false;
        }
      });
    };

    CrowdSync.prototype.loadNextTrack = function() {
      var _this = this;
      if (this.settings.debugging === true) this.log('Loading next track...');
      return $.ajax({
        url: "/CrowdSync.asmx/GetNextStartByCampusID?campusID=" + this.settings.campus,
        type: 'GET',
        data: '',
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        success: function(result) {
          var adjustedTime, endTime, serverTime, startTime;
          startTime = result.d.startTime;
          endTime = startTime + _this.currentTrack.ticks[_this.currentTrack.ticks.length - 1].time + _this.deltaOffset;
          _this.currentTrack.startTime = startTime;
          _this.currentTrack.endTime = endTime;
          if (_this.settings.debugging === true) {
            serverTime = new Date(_this.currentTrack.startTime);
            $('#debug').prepend("<h3>Server Start Time: " + (serverTime.toTimeString()) + "." + (serverTime.getMilliseconds()) + "</h3>");
          }
          _this.filterNotes();
          _this.convertToClientTime();
          if (_this.settings.debugging === true) {
            adjustedTime = new Date(_this.currentTrack.startTime);
            $('#debug').prepend("<h3>Adjusted Start Time: " + (adjustedTime.toTimeString()) + "." + (adjustedTime.getMilliseconds()) + "</h3>");
            $('#debug').prepend("Current Notes: " + (_this.clientNotes.join(', ')));
          }
          _this.countDownTimer = setInterval(function() {
            return _this.countDown();
          }, _this.settings.cycleLength);
          return false;
        },
        error: function(result, status, error) {
          if (_this.settings.debugging === true) _this.log(result.responseText);
          return false;
        }
      });
    };

    CrowdSync.prototype.countDown = function() {
      var audioPlayTime, remainingMilliseconds, remainingSeconds, theTime;
      theTime = new Date();
      if (this.currentTrack.countDownStartTime <= theTime) {
        remainingMilliseconds = this.currentTrack.startTime - theTime.getTime();
        audioPlayTime = this.currentTrack.startTime + this.settings.audioStartOffset + this.settings.cycleLength;
        if (this.settings.shouldPlayAudio === true && audioPlayTime <= theTime && this.playingAudio === false) {
          if (this.settings.debugging) this.log('Playing audio...');
          this.audio.play();
          this.playingAudio = true;
        }
        if (this.settings.debugging) $('.main-screen').text(remainingMilliseconds);
        if (remainingMilliseconds <= 0) {
          if (this.settings.displayLogo === true) {
            $('.main-screen').removeClass("logo-" + (this.settings.notes.join(' logo-')));
          }
          if (this.settings.displaySplash === true) {
            $('.splash').removeClass('splash');
          }
          clearTimeout(this.countDownTimer);
          this.play();
        }
        if (this.settings.displayCountDown === true) {
          remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
          $('.count-down').text(this.formatCountDownTime(remainingSeconds));
          if (remainingMilliseconds <= 0) {
            return $('.count-down').fadeOut('slow', function() {
              return $(this).remove();
            });
          }
        }
      }
    };

    CrowdSync.prototype.play = function() {
      var func,
        _this = this;
      if (this.settings.debugging === true) this.log("Starting tick...");
      func = this.settings.useCanvas === false ? this.paintDom : this.paintCanvas;
      return this.cycleTimer = setInterval(function() {
        return _this.tick(func);
      }, this.settings.cycleLength);
    };

    CrowdSync.prototype.tick = function(callback) {
      var currentTick, theTime,
        _this = this;
      theTime = new Date();
      currentTick = this.currentTrack.ticks[this.playHeadIndex];
      if ((currentTick != null) && theTime >= currentTick.time) {
        callback.call(this, theTime, currentTick);
        return this.playHeadIndex += 1;
      } else if (theTime > this.currentTrack.endTime) {
        clearTimeout(this.cycleTimer);
        if (this.settings.useCanvas === true) this.clearCanvas();
        if (this.settings.debugging === true) this.log('Song has ended...');
        if (this.settings.shouldPlayAudio === true) {
          if (this.settings.debugging === true) 'Stopping audio track...';
          setTimeout(function() {
            _this.audio.pause();
            return _this.playingAudio = false;
          }, 1000);
        }
        return setTimeout(function() {
          return $('.overlay').fadeIn('slow');
        }, 3000);
      }
    };

    CrowdSync.prototype.paintDom = function(theTime, theTick) {
      var selector;
      selector = "." + (theTick.notes.join(', .'));
      $(selector).removeClass('off');
      return setTimeout(function() {
        return $(selector).addClass('off');
      }, theTick.duration);
    };

    CrowdSync.prototype.initCanvas = function() {
      this.clientNotes = this.settings.notes;
      if (this.settings.debugging) this.log('Initializing canvas...');
      this.canvasWidth = 1240;
      this.canvasHeight = 728;
      this.canvas = document.getElementById('main-screen');
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
      this.context = this.canvas.getContext('2d');
      this.lights = [];
      return this.plotTree();
    };

    CrowdSync.prototype.plotTree = function() {
      var colSpacing, cols, i, index, j, noteName, rowSpacing, widthFactor, xOffset, xPos, yOffset, yPos,
        _this = this;
      if (this.settings.debugging) this.log('Plotting points...');
      colSpacing = 17;
      rowSpacing = colSpacing;
      xOffset = Math.ceil(this.canvasWidth / 2);
      yOffset = Math.ceil(this.canvasHeight * .05);
      for (i = 0; i <= 38; i++) {
        if (i === 38) {
          cols = 4;
        } else if (i === 37) {
          cols = 7;
        } else if (i > 0) {
          cols = Math.ceil(i / 4 + 2);
        } else {
          cols = 1;
        }
        yPos = (i * rowSpacing) + yOffset;
        colSpacing += .05;
        widthFactor = Math.sin((i + 5) / 18) * 50;
        for (j = 0; 0 <= cols ? j <= cols : j >= cols; 0 <= cols ? j++ : j--) {
          xPos = xOffset - (cols * widthFactor / 2) + (j * widthFactor);
          index = Math.floor(Math.random() * this.settings.notes.length);
          noteName = this.settings.notes[index];
          xPos = this.nudge(xPos);
          yPos = this.nudge(yPos);
          this.lights.push({
            x: xPos,
            innerX: xPos,
            y: yPos,
            innerY: yPos,
            color: this.canvasColors[noteName],
            note: this.settings.notes[index]
          });
        }
      }
      if (this.settings.debugging === true) this.log(this.lights);
      return this.canvasTimer = setInterval(function() {
        return _this.paintLights();
      }, this.settings.cycleLength);
    };

    CrowdSync.prototype.clearCanvas = function() {
      clearTimeout(this.canvasTimer);
      return this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    };

    CrowdSync.prototype.nudge = function(n) {
      var d;
      d = Math.floor(Math.random() * 10);
      return n + (Math.random() > .5 ? -d : d);
    };

    CrowdSync.prototype.nudgeBlur = function(n, center, radius) {
      var d;
      d = Math.random() * 100 > 30 ? 1 : 0;
      d = Math.random() > .5 ? -d : d;
      n = n + d;
      if (n >= center + radius - 3) {
        n = n - 1;
      } else if (n <= center - radius + 3) {
        n = n + 1;
      }
      return n;
    };

    CrowdSync.prototype.paintCanvas = function(theTime, theTick) {
      var note, _i, _len, _ref,
        _this = this;
      _ref = theTick.notes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        note = _ref[_i];
        if (this.settings.debugging === true) this.log(note);
        this.canvasColors[note].a = 0.81;
      }
      return setTimeout(function() {
        return _this.lightsOut(theTick);
      }, theTick.duration);
    };

    CrowdSync.prototype.paintLights = function() {
      var color, gradient, light, radians, radius, _i, _len, _ref, _results;
      this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      radians = Math.PI * 2;
      radius = 13;
      _ref = this.lights;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        light = _ref[_i];
        color = this.canvasColors[light.note];
        light.innerX = this.nudgeBlur(light.innerX, light.x, radius);
        light.innerY = this.nudgeBlur(light.innerY, light.y, radius);
        gradient = this.context.createRadialGradient(light.innerX, light.innerY, 0, light.x, light.y, radius);
        gradient.addColorStop(0.6, "rgba(" + color.r + ", " + color.g + ", " + color.b + ", " + color.a + ")");
        gradient.addColorStop(1, "rgba(" + color.r + ", " + color.g + ", " + color.b + ", 0)");
        this.context.fillStyle = gradient;
        this.context.beginPath();
        this.context.arc(light.x, light.y, radius, 0, radians, true);
        this.context.closePath();
        _results.push(this.context.fill());
      }
      return _results;
    };

    CrowdSync.prototype.lightsOut = function(theTick) {
      var fadeTimer,
        _this = this;
      if (this.settings.debugging === true) {
        "Turning off '" + (theTick.notes.join(', ')) + "'";
      }
      fadeTimer = setInterval(function() {
        return _this.fadeLights(theTick);
      }, this.settings.cycleLength);
      return theTick.fadeTimer = fadeTimer;
    };

    CrowdSync.prototype.fadeLights = function(theTick) {
      var note, _i, _len, _ref, _results;
      _ref = theTick.notes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        note = _ref[_i];
        this.canvasColors[note].a -= .5;
        if (this.canvasColors[note].a <= 0.05) {
          this.canvasColors[note].a = 0;
          _results.push(clearTimeout(theTick.fadeTimer));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    CrowdSync.prototype.canvasColors = {
      a: {
        r: 255,
        g: 4,
        b: 38,
        a: 0
      },
      b: {
        r: 0,
        g: 201,
        b: 235,
        a: 0
      },
      c: {
        r: 46,
        g: 248,
        b: 25,
        a: 0
      },
      d: {
        r: 255,
        g: 224,
        b: 0,
        a: 0
      }
    };

    CrowdSync.prototype.currentTrack = {
      startTime: 123578916,
      endTime: 12345667,
      ticks: [
        {
          notes: ["a"],
          time: 19,
          duration: 900
        }, {
          notes: ["b"],
          time: 986,
          duration: 900
        }, {
          notes: ["c"],
          time: 1939,
          duration: 900
        }, {
          notes: ["d"],
          time: 2908,
          duration: 900
        }, {
          notes: ["a"],
          time: 3879,
          duration: 900
        }, {
          notes: ["b"],
          time: 4843,
          duration: 900
        }, {
          notes: ["c"],
          time: 5811,
          duration: 900
        }, {
          notes: ["d"],
          time: 6801,
          duration: 900
        }, {
          notes: ["a"],
          time: 7747,
          duration: 900
        }, {
          notes: ["b"],
          time: 8715,
          duration: 900
        }, {
          notes: ["c"],
          time: 9682,
          duration: 900
        }, {
          notes: ["d"],
          time: 10645,
          duration: 900
        }, {
          notes: ["a"],
          time: 11607,
          duration: 900
        }, {
          notes: ["b"],
          time: 12585,
          duration: 900
        }, {
          notes: ["c"],
          time: 13556,
          duration: 900
        }, {
          notes: ["d"],
          time: 14521,
          duration: 900
        }, {
          notes: ["a"],
          time: 15486,
          duration: 900
        }, {
          notes: ["b"],
          time: 16455,
          duration: 900
        }, {
          notes: ["c"],
          time: 17415,
          duration: 900
        }, {
          notes: ["d"],
          time: 18419,
          duration: 900
        }, {
          notes: ["a"],
          time: 19362,
          duration: 900
        }, {
          notes: ["b"],
          time: 20294,
          duration: 900
        }, {
          notes: ["c"],
          time: 21275,
          duration: 900
        }, {
          notes: ["d"],
          time: 22263,
          duration: 900
        }, {
          notes: ["c"],
          time: 23235,
          duration: 307
        }, {
          notes: ["a"],
          time: 23876,
          duration: 159
        }, {
          notes: ["c"],
          time: 24198,
          duration: 309
        }, {
          notes: ["a"],
          time: 24843,
          duration: 155
        }, {
          notes: ["c"],
          time: 25162,
          duration: 327
        }, {
          notes: ["a"],
          time: 25811,
          duration: 163
        }, {
          notes: ["c"],
          time: 26134,
          duration: 315
        }, {
          notes: ["a"],
          time: 26779,
          duration: 162
        }, {
          notes: ["c"],
          time: 27101,
          duration: 324
        }, {
          notes: ["a"],
          time: 27746,
          duration: 164
        }, {
          notes: ["c"],
          time: 28067,
          duration: 326
        }, {
          notes: ["a"],
          time: 28714,
          duration: 161
        }, {
          notes: ["c"],
          time: 29037,
          duration: 324
        }, {
          notes: ["a"],
          time: 29682,
          duration: 161
        }, {
          notes: ["c"],
          time: 30005,
          duration: 323
        }, {
          notes: ["a"],
          time: 30650,
          duration: 161
        }, {
          notes: ["d"],
          time: 30972,
          duration: 324
        }, {
          notes: ["b"],
          time: 31940,
          duration: 326
        }, {
          notes: ["c"],
          time: 32908,
          duration: 330
        }, {
          notes: ["a"],
          time: 33875,
          duration: 324
        }, {
          notes: ["a"],
          time: 36778,
          duration: 160
        }, {
          notes: ["b"],
          time: 37101,
          duration: 162
        }, {
          notes: ["c"],
          time: 37424,
          duration: 162
        }, {
          notes: ["d"],
          time: 37746,
          duration: 164
        }, {
          notes: ["a"],
          time: 38069,
          duration: 325
        }, {
          notes: ["b"],
          time: 38392,
          duration: 162
        }, {
          notes: ["a"],
          time: 39682,
          duration: 162
        }, {
          notes: ["b"],
          time: 40005,
          duration: 161
        }, {
          notes: ["c"],
          time: 40327,
          duration: 163
        }, {
          notes: ["a"],
          time: 41617,
          duration: 165
        }, {
          notes: ["b"],
          time: 41940,
          duration: 163
        }, {
          notes: ["c"],
          time: 42263,
          duration: 161
        }, {
          notes: ["d"],
          time: 46456,
          duration: 322
        }, {
          notes: ["c"],
          time: 46783,
          duration: 322
        }, {
          notes: ["b"],
          time: 47100,
          duration: 161
        }, {
          notes: ["a"],
          time: 47424,
          duration: 322
        }, {
          notes: ["d"],
          time: 47751,
          duration: 320
        }, {
          notes: ["c"],
          time: 48069,
          duration: 320
        }, {
          notes: ["d"],
          time: 48393,
          duration: 320
        }, {
          notes: ["c"],
          time: 48719,
          duration: 320
        }, {
          notes: ["b"],
          time: 49037,
          duration: 162
        }, {
          notes: ["a"],
          time: 49359,
          duration: 328
        }, {
          notes: ["d"],
          time: 49682,
          duration: 322
        }, {
          notes: ["c"],
          time: 50009,
          duration: 316
        }, {
          notes: ["d"],
          time: 54197,
          duration: 324
        }, {
          notes: ["c"],
          time: 54521,
          duration: 323
        }, {
          notes: ["b"],
          time: 54842,
          duration: 161
        }, {
          notes: ["a"],
          time: 55165,
          duration: 324
        }, {
          notes: ["d"],
          time: 55488,
          duration: 324
        }, {
          notes: ["c"],
          time: 55811,
          duration: 325
        }, {
          notes: ["d"],
          time: 56134,
          duration: 323
        }, {
          notes: ["c"],
          time: 56456,
          duration: 322
        }, {
          notes: ["b"],
          time: 56783,
          duration: 157
        }, {
          notes: ["a"],
          time: 57101,
          duration: 322
        }, {
          notes: ["d"],
          time: 57428,
          duration: 322
        }, {
          notes: ["c"],
          time: 57746,
          duration: 162
        }, {
          notes: ["b"],
          time: 58069,
          duration: 321
        }, {
          notes: ["d"],
          time: 58714,
          duration: 325
        }, {
          notes: ["b"],
          time: 59037,
          duration: 324
        }, {
          notes: ["d"],
          time: 59684,
          duration: 323
        }, {
          notes: ["b"],
          time: 60004,
          duration: 325
        }, {
          notes: ["d"],
          time: 60650,
          duration: 324
        }, {
          notes: ["b"],
          time: 60972,
          duration: 323
        }, {
          notes: ["d"],
          time: 61617,
          duration: 326
        }, {
          notes: ["b"],
          time: 61940,
          duration: 323
        }, {
          notes: ["d"],
          time: 62585,
          duration: 325
        }, {
          notes: ["b"],
          time: 62908,
          duration: 322
        }, {
          notes: ["d"],
          time: 63549,
          duration: 328
        }, {
          notes: ["b"],
          time: 63875,
          duration: 321
        }, {
          notes: ["d"],
          time: 64521,
          duration: 319
        }, {
          notes: ["b"],
          time: 64838,
          duration: 343
        }, {
          notes: ["d"],
          time: 65488,
          duration: 327
        }, {
          notes: ["b"],
          time: 65811,
          duration: 319
        }, {
          notes: ["d"],
          time: 66456,
          duration: 324
        }, {
          notes: ["b"],
          time: 66777,
          duration: 328
        }, {
          notes: ["d"],
          time: 67424,
          duration: 324
        }, {
          notes: ["b"],
          time: 67746,
          duration: 325
        }, {
          notes: ["d"],
          time: 68392,
          duration: 324
        }, {
          notes: ["b"],
          time: 68714,
          duration: 325
        }, {
          notes: ["d"],
          time: 69359,
          duration: 325
        }, {
          notes: ["b"],
          time: 69683,
          duration: 321
        }, {
          notes: ["d"],
          time: 70326,
          duration: 321
        }, {
          notes: ["b"],
          time: 70651,
          duration: 321
        }, {
          notes: ["d"],
          time: 71294,
          duration: 323
        }, {
          notes: ["b"],
          time: 71617,
          duration: 322
        }, {
          notes: ["d"],
          time: 72263,
          duration: 322
        }, {
          notes: ["b"],
          time: 72585,
          duration: 323
        }, {
          notes: ["d"],
          time: 73230,
          duration: 323
        }, {
          notes: ["b"],
          time: 73553,
          duration: 323
        }, {
          notes: ["d"],
          time: 74198,
          duration: 323
        }, {
          notes: ["b"],
          time: 74526,
          duration: 318
        }, {
          notes: ["d"],
          time: 75166,
          duration: 322
        }, {
          notes: ["b"],
          time: 75495,
          duration: 315
        }, {
          notes: ["d"],
          time: 76134,
          duration: 321
        }, {
          notes: ["b"],
          time: 76460,
          duration: 320
        }, {
          notes: ["a", "c"],
          time: 77425,
          duration: 161
        }, {
          notes: ["a", "c"],
          time: 78392,
          duration: 161
        }, {
          notes: ["a", "c"],
          time: 79363,
          duration: 164
        }, {
          notes: ["a", "c"],
          time: 80327,
          duration: 161
        }, {
          notes: ["a", "c"],
          time: 81294,
          duration: 167
        }, {
          notes: ["a", "c"],
          time: 82262,
          duration: 167
        }, {
          notes: ["a", "c"],
          time: 83230,
          duration: 159
        }, {
          notes: ["b", "d"],
          time: 84198,
          duration: 162
        }, {
          notes: ["a", "c"],
          time: 85166,
          duration: 159
        }, {
          notes: ["a", "c"],
          time: 86137,
          duration: 162
        }, {
          notes: ["a", "c"],
          time: 87101,
          duration: 163
        }, {
          notes: ["a", "c"],
          time: 88066,
          duration: 132
        }, {
          notes: ["a", "c"],
          time: 89038,
          duration: 158
        }, {
          notes: ["a", "c"],
          time: 90004,
          duration: 170
        }, {
          notes: ["a", "c"],
          time: 90972,
          duration: 161
        }, {
          notes: ["b", "d"],
          time: 91940,
          duration: 165
        }, {
          notes: ["a"],
          time: 92909,
          duration: 1937
        }, {
          notes: ["b"],
          time: 94843,
          duration: 1936
        }, {
          notes: ["c"],
          time: 96779,
          duration: 1937
        }, {
          notes: ["d"],
          time: 98714,
          duration: 1940
        }, {
          notes: ["a"],
          time: 100650,
          duration: 1938
        }, {
          notes: ["b"],
          time: 102585,
          duration: 900
        }, {
          notes: ["c"],
          time: 103553,
          duration: 900
        }, {
          notes: ["d"],
          time: 104521,
          duration: 163
        }, {
          notes: ["c"],
          time: 105487,
          duration: 157
        }, {
          notes: ["b"],
          time: 106456,
          duration: 163
        }, {
          notes: ["a"],
          time: 107425,
          duration: 156
        }, {
          notes: ["d"],
          time: 108391,
          duration: 162
        }, {
          notes: ["c"],
          time: 109359,
          duration: 159
        }, {
          notes: ["b"],
          time: 110326,
          duration: 164
        }, {
          notes: ["a"],
          time: 111295,
          duration: 160
        }, {
          notes: ["a", "c"],
          time: 112264,
          duration: 166
        }, {
          notes: ["a", "c"],
          time: 113230,
          duration: 159
        }, {
          notes: ["a", "c"],
          time: 114198,
          duration: 167
        }, {
          notes: ["a", "c"],
          time: 115164,
          duration: 134
        }, {
          notes: ["a", "c"],
          time: 116133,
          duration: 161
        }, {
          notes: ["a", "c"],
          time: 117101,
          duration: 163
        }, {
          notes: ["a", "c"],
          time: 118069,
          duration: 160
        }, {
          notes: ["b", "d"],
          time: 119037,
          duration: 160
        }, {
          notes: ["a", "c"],
          time: 120004,
          duration: 164
        }, {
          notes: ["a", "c"],
          time: 120972,
          duration: 164
        }, {
          notes: ["a", "c"],
          time: 121940,
          duration: 163
        }, {
          notes: ["a", "c"],
          time: 122907,
          duration: 162
        }, {
          notes: ["a", "c"],
          time: 123874,
          duration: 164
        }, {
          notes: ["a", "c"],
          time: 124843,
          duration: 161
        }, {
          notes: ["a", "c"],
          time: 125811,
          duration: 164
        }, {
          notes: ["b", "d"],
          time: 126780,
          duration: 160
        }, {
          notes: ["a"],
          time: 127746,
          duration: 1939
        }, {
          notes: ["b"],
          time: 129682,
          duration: 1938
        }, {
          notes: ["c"],
          time: 131617,
          duration: 1934
        }, {
          notes: ["d"],
          time: 133556,
          duration: 1934
        }, {
          notes: ["a"],
          time: 135488,
          duration: 1936
        }, {
          notes: ["b"],
          time: 137424,
          duration: 900
        }, {
          notes: ["c"],
          time: 138391,
          duration: 900
        }, {
          notes: ["d"],
          time: 139359,
          duration: 1937
        }, {
          notes: ["a"],
          time: 141294,
          duration: 1937
        }, {
          notes: ["b"],
          time: 143230,
          duration: 1937
        }, {
          notes: ["c"],
          time: 145327,
          duration: 1775
        }, {
          notes: ["a"],
          time: 166461,
          duration: 900
        }, {
          notes: ["b"],
          time: 167426,
          duration: 900
        }, {
          notes: ["c"],
          time: 168386,
          duration: 900
        }, {
          notes: ["d"],
          time: 169359,
          duration: 900
        }, {
          notes: ["a"],
          time: 170328,
          duration: 900
        }, {
          notes: ["b"],
          time: 171295,
          duration: 900
        }, {
          notes: ["c"],
          time: 172265,
          duration: 900
        }, {
          notes: ["d"],
          time: 173227,
          duration: 900
        }, {
          notes: ["a"],
          time: 174198,
          duration: 900
        }, {
          notes: ["b"],
          time: 175165,
          duration: 900
        }, {
          notes: ["c"],
          time: 176126,
          duration: 900
        }, {
          notes: ["d"],
          time: 177104,
          duration: 900
        }, {
          notes: ["a"],
          time: 178068,
          duration: 900
        }, {
          notes: ["b"],
          time: 179036,
          duration: 900
        }, {
          notes: ["c"],
          time: 180008,
          duration: 900
        }, {
          notes: ["d"],
          time: 180972,
          duration: 900
        }, {
          notes: ["a"],
          time: 181936,
          duration: 164
        }, {
          notes: ["b"],
          time: 182907,
          duration: 159
        }, {
          notes: ["c"],
          time: 183875,
          duration: 159
        }, {
          notes: ["d"],
          time: 184843,
          duration: 162
        }, {
          notes: ["d"],
          time: 185488,
          duration: 163
        }, {
          notes: ["a"],
          time: 187746,
          duration: 163
        }, {
          notes: ["b"],
          time: 188069,
          duration: 160
        }, {
          notes: ["c"],
          time: 189036,
          duration: 200
        }, {
          notes: ["d"],
          time: 189359,
          duration: 161
        }, {
          notes: ["d"],
          time: 190649,
          duration: 326
        }, {
          notes: ["a"],
          time: 191295,
          duration: 163
        }, {
          notes: ["b"],
          time: 192587,
          duration: 330
        }, {
          notes: ["d"],
          time: 193230,
          duration: 164
        }, {
          notes: ["b"],
          time: 193552,
          duration: 320
        }, {
          notes: ["d"],
          time: 194197,
          duration: 164
        }, {
          notes: ["b"],
          time: 194520,
          duration: 324
        }, {
          notes: ["d"],
          time: 195165,
          duration: 162
        }, {
          notes: ["b"],
          time: 195488,
          duration: 325
        }, {
          notes: ["d"],
          time: 196133,
          duration: 162
        }, {
          notes: ["b"],
          time: 196456,
          duration: 322
        }, {
          notes: ["d"],
          time: 197101,
          duration: 159
        }, {
          notes: ["a"],
          time: 197424,
          duration: 161
        }, {
          notes: ["b"],
          time: 197746,
          duration: 150
        }, {
          notes: ["a"],
          time: 197907,
          duration: 160
        }, {
          notes: ["c"],
          time: 198071,
          duration: 160
        }, {
          notes: ["d"],
          time: 198230,
          duration: 163
        }, {
          notes: ["a"],
          time: 198391,
          duration: 162
        }, {
          notes: ["b"],
          time: 198714,
          duration: 150
        }, {
          notes: ["a"],
          time: 198875,
          duration: 161
        }, {
          notes: ["c"],
          time: 199036,
          duration: 162
        }, {
          notes: ["d"],
          time: 199198,
          duration: 161
        }, {
          notes: ["a"],
          time: 199359,
          duration: 162
        }, {
          notes: ["b"],
          time: 199682,
          duration: 150
        }, {
          notes: ["a"],
          time: 199843,
          duration: 163
        }, {
          notes: ["c"],
          time: 200004,
          duration: 161
        }, {
          notes: ["d"],
          time: 200170,
          duration: 157
        }, {
          notes: ["c"],
          time: 200327,
          duration: 160
        }, {
          notes: ["b"],
          time: 200649,
          duration: 107
        }, {
          notes: ["a"],
          time: 200811,
          duration: 150
        }, {
          notes: ["c"],
          time: 200972,
          duration: 150
        }, {
          notes: ["a"],
          time: 203231,
          duration: 162
        }, {
          notes: ["b"],
          time: 203398,
          duration: 153
        }, {
          notes: ["c"],
          time: 203555,
          duration: 162
        }, {
          notes: ["d"],
          time: 203714,
          duration: 161
        }, {
          notes: ["a"],
          time: 203883,
          duration: 153
        }, {
          notes: ["b"],
          time: 204036,
          duration: 163
        }, {
          notes: ["c"],
          time: 204198,
          duration: 159
        }, {
          notes: ["d"],
          time: 204360,
          duration: 162
        }, {
          notes: ["a"],
          time: 204520,
          duration: 320
        }, {
          notes: ["c"],
          time: 204846,
          duration: 155
        }, {
          notes: ["a"],
          time: 206133,
          duration: 163
        }, {
          notes: ["b"],
          time: 206294,
          duration: 164
        }, {
          notes: ["c"],
          time: 206456,
          duration: 165
        }, {
          notes: ["d"],
          time: 206617,
          duration: 163
        }, {
          notes: ["a"],
          time: 206778,
          duration: 164
        }, {
          notes: ["c"],
          time: 206940,
          duration: 163
        }, {
          notes: ["a"],
          time: 208069,
          duration: 167
        }, {
          notes: ["b"],
          time: 208230,
          duration: 159
        }, {
          notes: ["c"],
          time: 208395,
          duration: 158
        }, {
          notes: ["d"],
          time: 208558,
          duration: 159
        }, {
          notes: ["a"],
          time: 208715,
          duration: 162
        }, {
          notes: ["c"],
          time: 208875,
          duration: 150
        }, {
          notes: ["b"],
          time: 209036,
          duration: 326
        }, {
          notes: ["d"],
          time: 209682,
          duration: 163
        }, {
          notes: ["b"],
          time: 210003,
          duration: 323
        }, {
          notes: ["d"],
          time: 210649,
          duration: 161
        }, {
          notes: ["b"],
          time: 210971,
          duration: 327
        }, {
          notes: ["d"],
          time: 211616,
          duration: 163
        }, {
          notes: ["b"],
          time: 211940,
          duration: 322
        }, {
          notes: ["d"],
          time: 212585,
          duration: 162
        }, {
          notes: ["b"],
          time: 212907,
          duration: 323
        }, {
          notes: ["d"],
          time: 213553,
          duration: 159
        }, {
          notes: ["b"],
          time: 213875,
          duration: 323
        }, {
          notes: ["d"],
          time: 214520,
          duration: 162
        }, {
          notes: ["b"],
          time: 214844,
          duration: 321
        }, {
          notes: ["d"],
          time: 215488,
          duration: 161
        }, {
          notes: ["b"],
          time: 215811,
          duration: 324
        }, {
          notes: ["d"],
          time: 216456,
          duration: 161
        }, {
          notes: ["b"],
          time: 216778,
          duration: 324
        }, {
          notes: ["d"],
          time: 217424,
          duration: 150
        }, {
          notes: ["b"],
          time: 217746,
          duration: 323
        }, {
          notes: ["d"],
          time: 218391,
          duration: 160
        }, {
          notes: ["b"],
          time: 218714,
          duration: 323
        }, {
          notes: ["d"],
          time: 219359,
          duration: 161
        }, {
          notes: ["b"],
          time: 219683,
          duration: 320
        }, {
          notes: ["d"],
          time: 220327,
          duration: 150
        }, {
          notes: ["b"],
          time: 220649,
          duration: 324
        }, {
          notes: ["d"],
          time: 221294,
          duration: 161
        }, {
          notes: ["b"],
          time: 221617,
          duration: 323
        }, {
          notes: ["d"],
          time: 222262,
          duration: 161
        }, {
          notes: ["b"],
          time: 222584,
          duration: 325
        }, {
          notes: ["d"],
          time: 223230,
          duration: 160
        }, {
          notes: ["b"],
          time: 223553,
          duration: 323
        }, {
          notes: ["d"],
          time: 224198,
          duration: 161
        }, {
          notes: ["a", "c"],
          time: 224520,
          duration: 162
        }, {
          notes: ["b", "d"],
          time: 225488,
          duration: 162
        }, {
          notes: ["a", "c"],
          time: 226456,
          duration: 163
        }, {
          notes: ["b", "d"],
          time: 227423,
          duration: 161
        }, {
          notes: ["a", "b", "c", "d"],
          time: 228390,
          duration: 3551
        }, {
          notes: ["a", "b", "c", "d"],
          time: 232262,
          duration: 162
        }
      ]
    };

    return CrowdSync;

  })();

}).call(this);
