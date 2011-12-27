###*
 * CrowdSync version 0.6.0
 * (c) 2011 Central Christian Church - www.centralaz.com
 * CrowdSync may be freely distributed under the MIT license.
 * For all details and documentation head to http://github.com/centralaz/crowdsync
 ###
class window.CrowdSync
	constructor: (options = {}) -> 
		if options then @settings = options
		@initSettings(options)
		if @settings.useCanvas is false then @loadNotesFromDom() else @initCanvas()
		@initDocument()

	# Initializes settings to their defaults when app is initialized
	initSettings: (options) ->
		@deltaOffset = Number.MAX_VALUE
		@playHeadIndex = 0
		@settings.cycleLength = options.cycleLength or 10
		@settings.campus = options.campus or 1
		@settings.displayLogo = options.displayLogo or false
		@settings.displaySplash = options.displaySplash or false
		@settings.serverCheckCount = 1
		@settings.displayCountDown = options.displayCountDown or true
		@settings.countDownLength = options.countDownLength or 30000
		@settings.debugging = options.debugging or false
		@settings.notes = options.notes or ['a','b','c','d']
		@settings.randomizeColor = if options.randomizeColor? then options.randomizeColor else true
		@clientNotes = []
		@settings.useCanvas = options.useCanvas or false
		@settings.shouldPlayAudio = options.shouldPlayAudio or false
		@settings.audioStartOffset = options.audioStartOffset or 0
		@settings.audioFileName = options.audioFileName or ''
		if @settings.shouldPlayAudio is true
			@audio = new Audio(@settings.audioFileName) 
			@playingAudio = false
			@testAudio()
	
	# Kicks the tires on audio playback.
	testAudio: ->
		if typeof webkitAudioContext is 'undefined' then return
		@audioContext = new webkitAudioContext()
		@source = @audioContext.createBufferSource();
		@processor = @audioContext.createJavaScriptNode(2048);
		
		# When audio metadata becomes available, log end date to determine any possible delay in playback
		audioAvailable = (event) => @processor.onaudioprocess = null
		@source.connect(@processor)
		@processor.connect(@audioContext.destination)
		request = new XMLHttpRequest()
		request.open('GET', @settings.audioFileName, true)
		request.responseType = 'arraybuffer'
		
		# Attempts to load file via ArrayBuffer from an AJAX request and autoplay.
		request.onload = () =>
			@source.buffer = @audioContext.createBuffer(request.response, false)
			@source.looping = true
			@processor.onaudioprocess = audioAvailable
			@source.noteOn(0)
		request.send()
		
	# Prepares DOM based on default/client settings
	initDocument: ->
		if @settings.displayCountDown is true then $('<div class="count-down"/>').appendTo('body')
		if @settings.debugging is true then $('<div id="debug"/>').appendTo('body')
		if @settings.displayLogo is true
			for note in @clientNotes
				$(".#{note}").addClass("logo-#{note}")
			
	# Based on user settings will gather the "notes" the client is responsible for playing
	loadNotesFromDom: ->
		addNote = (note, array) ->
			if $.inArray(note, array) is -1 then array.push(note)
		# If we've already got the DOM configured with colors, don't do anything...
		if @settings.randomizeColor is false
			# Find the notes that are defined in the markup to store in settings
			for note in @settings.notes
				if $('.main-screen').hasClass(note)
					addNote(note, @clientNotes)
					if @settings.debugging is false then $('.main-screen').text('')
		else
			# Add new note to the dom and store them in settings
			that = @
			$('.main-screen').removeClass(@settings.notes.join(' ')).each ->
				i = Math.floor(Math.random() * that.settings.notes.length)
				theNote = that.settings.notes[i]
				$(this).addClass(theNote)
				addNote(theNote, that.clientNotes)
				if that.settings.debugging is true then $(this).text(theNote)

	# Wrapper for console.log to guard against errors in browsers that don't support it
	log: (message) ->
		if typeof console isnt 'undefined' and console.log then console.log(message)

	# After getting the current notes to watch, and the track from the server,
	# filter out any ticks in the current track that the client doesn't need
	# to care about.
	filterNotes: ->
		@currentTrack.ticks = $.grep @currentTrack.ticks, (element, index) =>
			hasNotes = $.grep element.notes, (note, i) =>
				result = $.inArray(note, @clientNotes)
				result > -1
			hasNotes.length > 0
		if @settings.debugging is true
			@log('Filtering out mismatched notes...')
			@log(@currentTrack)

	# Once notes have been filtered, set each tick's play time based on adjusted start time
	convertToClientTime: ->
		if @settings.debugging is true then @log("Current start time: #{@currentTrack.startTime}")
		@currentTrack.startTime = @currentTrack.startTime + @deltaOffset
		# Countdown starts 30 sec prior to start time
		@currentTrack.countDownStartTime = @currentTrack.startTime - @settings.countDownLength
		$.each @currentTrack.ticks, (index, value) =>
			value.time += @currentTrack.startTime
		if @settings.debugging is true
			@log 'Converting relative timecodes to client time...'
			@log(@currentTrack)

	# Formats seconds passed in to a more human readable format: e.g. - 3:16
	formatCountDownTime: (seconds) ->
		minutes = Math.floor(seconds / 60) % 60
		seconds = seconds % 60
		if minutes > 0 
			if seconds.toString().length is 1 then seconds = "0#{seconds}"
			return "#{minutes}:#{seconds}"
		else return seconds

	# Writes debugging timer info to the DOM
	writeTimerInfo: (delta) ->
		$ul = $('<ul/>')
		$ul.append "<li>Client Time: #{@clientTime.getTime()}</li>"
		$ul.append "<li>Server Time: #{@serverTime}</li>"
		$ul.append "<li>Delta: #{delta}</li>"
		$ul.append "<li>Min Delta: #{@deltaOffset}</li>"
		$ul.prependTo '#debug'

	# Initiate polling the server to get the difference between client and server time
	start: (count) ->
		if @debugging is true then $('<div id="debug"/>').appendTo 'body'
		@deltaCount = count
		@deltaTimer = setInterval(=> 
			@getDelta()
		, 500)

	# Pings the server to check the current time
	getDelta: ->
		$.ajax
			url: '/Arena/WebServices/Custom/Cccev/Server/ChristmasService.asmx/GetTime'
			type: 'GET'
			data: ''
			contentType: 'application/json; charset=utf-8'
			dataType: 'json'
			success: (result) =>
				@serverTime = result.d
				@clientTime = new Date()
				delta = @clientTime.getTime() - @serverTime
				@deltaOffset = delta if delta < @deltaOffset
				if @settings.debugging is true then @writeTimerInfo(delta)
				# When we're done computing the time delta, load the next track...
				if @settings.serverCheckCount++ >= @deltaCount
					clearTimeout(@deltaTimer)
					@loadNextTrack()
				false
			error: (result, status, error) =>
				clearTimeout(@deltaTimer)
				if @settings.debugging is true then @log(result.responseText)
				false

	# Loads the next track to play
	loadNextTrack: ->
		if @settings.debugging is true then @log('Loading next track...')
		$.ajax
			url: "/Arena/WebServices/Custom/Cccev/Server/ChristmasService.asmx/GetNextStartByCampusID?campusID=#{@settings.campus}"
			type: 'GET'
			data: ''
			contentType: 'application/json; charset=utf-8'
			dataType: 'json'
			success: (result) =>
				startTime = result.d.startTime
				endTime = startTime + @currentTrack.ticks[@currentTrack.ticks.length - 1].time + @deltaOffset
				@currentTrack.startTime = startTime
				@currentTrack.endTime = endTime
				if @settings.debugging is true
					serverTime = new Date(@currentTrack.startTime)
					$('#debug').prepend "<h3>Server Start Time: #{serverTime.toTimeString()}.#{serverTime.getMilliseconds()}</h3>"
				@filterNotes()
				@convertToClientTime()
				if @settings.debugging is true
					adjustedTime = new Date(@currentTrack.startTime)
					$('#debug').prepend "<h3>Adjusted Start Time: #{adjustedTime.toTimeString()}.#{adjustedTime.getMilliseconds()}</h3>"
					$('#debug').prepend "Current Notes: #{@clientNotes.join(', ')}"
				@countDownTimer = setInterval(=>
					@countDown()
				, @settings.cycleLength)
				false
			error: (result, status, error) => 
				if @settings.debugging is true then @log(result.responseText)
				false

	# Determines if/when to show the countdown on the DOM and plays audio
	countDown: ->
		theTime = new Date()		
		# Has the count down started yet?
		if @currentTrack.countDownStartTime <= theTime # and theTime < @currentTrack.startTime
			# Counting Down...
			remainingMilliseconds = @currentTrack.startTime - theTime.getTime()
			
			# Is it time to play the audio track?
			audioPlayTime = @currentTrack.startTime + @settings.audioStartOffset + @settings.cycleLength # - @audioDelay
			if @settings.shouldPlayAudio is true and audioPlayTime <= theTime and @playingAudio is false
				if @settings.debugging then @log 'Playing audio...'
				@audio.play()
				@playingAudio = true
			
			#@count = remainingSeconds
			if @settings.debugging then $('.main-screen').text(remainingMilliseconds)
			if remainingMilliseconds <= 0
				if @settings.displayLogo is true then $('.main-screen').removeClass("logo-#{@settings.notes.join(' logo-')}")
				if @settings.displaySplash is true then $('.splash').removeClass('splash')
				clearTimeout(@countDownTimer)
				@play()
			if @settings.displayCountDown is true
				remainingSeconds = Math.ceil(remainingMilliseconds / 1000)
				$('.count-down').text(@formatCountDownTime(remainingSeconds))
				if remainingMilliseconds <= 0
					$('.count-down').fadeOut 'slow', -> $(this).remove()

	# Initiates visual element, whether displayed via DOM manipulation or Canvas
	play: ->
		if @settings.debugging is true then @log "Starting tick..."
		func = if @settings.useCanvas is false then @paintDom else @paintCanvas
		@cycleTimer = setInterval(=>
			@tick(func)
		, @settings.cycleLength)

	# Determines the current position within the song and will start or stop visualization
	tick: (callback) ->
		theTime = new Date()
		currentTick = @currentTrack.ticks[@playHeadIndex]
		if currentTick? and theTime >= currentTick.time
			callback.call(@, theTime, currentTick)
			@playHeadIndex += 1
		# Stop playing, the current song has ended...
		else if theTime > @currentTrack.endTime
			clearTimeout(@cycleTimer)
			if @settings.useCanvas is true then @clearCanvas()
			if @settings.debugging is true then @log('Song has ended...')
			if @settings.shouldPlayAudio is true
				if @settings.debugging is true then 'Stopping audio track...'
				setTimeout(=>
					@audio.pause()
					@playingAudio = false
				, 1000)
			# Presentation has finished, fade out...
			setTimeout(->
				$('.overlay').fadeIn('slow')
			, 3000)
			# Load next track once the current one has completed...
			#@loadNextTrack()

	# Displays song data to the DOM via adding classes to '.main-screen' elements
	paintDom: (theTime, theTick) ->
		selector = ".#{theTick.notes.join(', .')}"
		$(selector).removeClass('off')
		setTimeout(->
			$(selector).addClass('off')
		, theTick.duration)

	# Prepares canvas for visualization to be drawn
	initCanvas: ->
		@clientNotes = @settings.notes
		if @settings.debugging then @log 'Initializing canvas...'
		@canvasWidth = 1240 # 1280 document.width
		@canvasHeight = 728 # 768 document.height
		@canvas = document.getElementById('main-screen')
		@canvas.width = @canvasWidth
		@canvas.height = @canvasHeight
		@context = @canvas.getContext('2d')
		@lights = []
		@plotTree()

	# Plots points of light on Canvas x,y and assigns colors in Christmas tree visualization
	plotTree: ->
		# Plot Christmas Tree lights here...
		if @settings.debugging then @log 'Plotting points...'
		colSpacing = 17
		rowSpacing = colSpacing
		xOffset = Math.ceil(@canvasWidth / 2)
		yOffset = Math.ceil(@canvasHeight * .05)
		for i in [0..38]
			if i is 38 then cols = 4
			else if i is 37 then cols = 7
			else if i > 0 then cols = Math.ceil(i / 4 + 2)
			else cols = 1
			yPos = (i * rowSpacing) + yOffset
			colSpacing += .05
			widthFactor = Math.sin((i+5) / 18) * 50
			for j in [0..cols]
				xPos = xOffset - (cols * widthFactor / 2) + (j * widthFactor)
				index = Math.floor(Math.random() * @settings.notes.length)
				noteName = @settings.notes[index]
				xPos = @nudge(xPos)
				yPos = @nudge(yPos)
				@lights.push(
					x: xPos
					innerX: xPos
					y: yPos
					innerY: yPos
					color: @canvasColors[noteName]
					note: @settings.notes[index]
				)
		if @settings.debugging is true then @log @lights
		# Paint lights ~100 frames per second
		@canvasTimer = setInterval(=>
			@paintLights()
		, @settings.cycleLength)

	# Clears canvas and kills timer that controls rendering tree to free up resources
	clearCanvas: ->
		clearTimeout(@canvasTimer)
		@context.clearRect(0, 0, @canvasWidth, @canvasHeight)

	# Randomizes light position based on it's initial position to make the tree appaer more organic
	nudge: (n) ->
		d = Math.floor(Math.random() * 10)
		n + if Math.random() > .5 then -d else d
	
	# Creates variance in position of blur effect on each 'light'
	nudgeBlur: (n, center, radius) ->
		d = if Math.random() * 100 > 30 then 1 else 0
		d = if Math.random() > .5 then -d else d
		n = n + d
		if n >= center + radius - 3 then n = n - 1
		else if n <= center - radius + 3 then n = n + 1
		n

	# Assigns alpha values of each 'light' on the canvas and sets up a timeout to fade out the lights
	paintCanvas: (theTime, theTick) ->
		for note in theTick.notes
			if @settings.debugging is true then @log note
			@canvasColors[note].a = 0.81
		setTimeout(=>
			@lightsOut(theTick)
		, theTick.duration)

	# Actually paints each light on the Canvas
	paintLights: ->
		# Draw lights onto canvas here...
		@context.clearRect(0, 0, @canvasWidth, @canvasHeight)
		radians = Math.PI * 2
		radius = 13
		for light in @lights
			color = @canvasColors[light.note]
			#@context.fillStyle = "rgba(#{color.r}, #{color.g}, #{color.b}, #{color.a})"
			light.innerX = @nudgeBlur(light.innerX, light.x, radius)
			light.innerY = @nudgeBlur(light.innerY, light.y, radius)
			gradient = @context.createRadialGradient(light.innerX, light.innerY, 0, light.x, light.y, radius)
			gradient.addColorStop(0.6, "rgba(#{color.r}, #{color.g}, #{color.b}, #{color.a})")
			gradient.addColorStop(1, "rgba(#{color.r}, #{color.g}, #{color.b}, 0)")
			@context.fillStyle = gradient
			@context.beginPath()
			@context.arc(light.x, light.y, radius, 0, radians, true)
			@context.closePath()
			@context.fill()

	# Stores a reference to timer ID and initializes callback to 'dim' lights
	lightsOut: (theTick) ->
		if @settings.debugging is true then "Turning off '#{theTick.notes.join(', ')}'"
		fadeTimer = setInterval(=>
			@fadeLights(theTick)
		, @settings.cycleLength)
		theTick.fadeTimer = fadeTimer

	# Fades out lights by decrementing the alpha value. Sets to 0 and kills fade timer when less than 5% opacity
	fadeLights: (theTick) ->
		for note in theTick.notes
			@canvasColors[note].a -= .5
			if @canvasColors[note].a <= 0.05
				@canvasColors[note].a = 0
				clearTimeout(theTick.fadeTimer)

	# Object to represent color values for Christmas tree light visualization
	canvasColors:
		a: { r: 255, g: 4, b: 38, a: 0 },	# a - Red
		b: { r: 0, g: 201, b: 235, a: 0 },	# b - Blue
		c: { r: 46, g: 248, b: 25, a: 0 },	# c - Green
		d: { r: 255, g: 224, b: 0, a: 0 } 	# d - Yellow

	# Object composed of decoded MIDI representing time signature of the light display
	currentTrack:
		startTime: 123578916,
		endTime: 12345667,
		ticks: [
			# 1
			{ notes: ["a"], time: 19, duration: 900 },
			{ notes: ["b"], time: 986, duration: 900 },
			
			{ notes: ["c"], time: 1939, duration: 900 },
			{ notes: ["d"], time: 2908, duration: 900 },
			
			{ notes: ["a"], time: 3879, duration: 900 },
			{ notes: ["b"], time: 4843, duration: 900 },
			
			{ notes: ["c"], time: 5811, duration: 900 },
			{ notes: ["d"], time: 6801, duration: 900 },
			
			{ notes: ["a"], time: 7747, duration: 900 },
			{ notes: ["b"], time: 8715, duration: 900 },
			
			{ notes: ["c"], time: 9682, duration: 900 },
			{ notes: ["d"], time: 10645, duration: 900 },
			
			{ notes: ["a"], time: 11607, duration: 900 },
			{ notes: ["b"], time: 12585, duration: 900 },
			
			{ notes: ["c"], time: 13556, duration: 900 },
			{ notes: ["d"], time: 14521, duration: 900 },
			
			# 9
			{ notes: ["a"], time: 15486, duration: 900 },
			{ notes: ["b"], time: 16455, duration: 900 },
			
			{ notes: ["c"], time: 17415, duration: 900 },
			{ notes: ["d"], time: 18419, duration: 900 },
			
			{ notes: ["a"], time: 19362, duration: 900 },
			{ notes: ["b"], time: 20294, duration: 900 },
			
			{ notes: ["c"], time: 21275, duration: 900 },
			{ notes: ["d"], time: 22263, duration: 900 },
			
			{ notes: ["c"], time: 23235, duration: 307 },
			{ notes: ["a"], time: 23876, duration: 159 },
			{ notes: ["c"], time: 24198, duration: 309 },
			{ notes: ["a"], time: 24843, duration: 155 },
			
			{ notes: ["c"], time: 25162, duration: 327 },
			{ notes: ["a"], time: 25811, duration: 163 },
			{ notes: ["c"], time: 26134, duration: 315 },
			{ notes: ["a"], time: 26779, duration: 162 },
			
			{ notes: ["c"], time: 27101, duration: 324 },
			{ notes: ["a"], time: 27746, duration: 164 },
			{ notes: ["c"], time: 28067, duration: 326 },
			{ notes: ["a"], time: 28714, duration: 161 },
			
			# 16
			{ notes: ["c"], time: 29037, duration: 324 },
			{ notes: ["a"], time: 29682, duration: 161 },
			{ notes: ["c"], time: 30005, duration: 323 },
			{ notes: ["a"], time: 30650, duration: 161 },
			
			{ notes: ["d"], time: 30972, duration: 324 },
			{ notes: ["b"], time: 31940, duration: 326 },
			
			{ notes: ["c"], time: 32908, duration: 330 },
			{ notes: ["a"], time: 33875, duration: 324 },
			
			{ notes: ["a"], time: 36778, duration: 160 },
			{ notes: ["b"], time: 37101, duration: 162 },
			{ notes: ["c"], time: 37424, duration: 162 },
			{ notes: ["d"], time: 37746, duration: 164 },
			{ notes: ["a"], time: 38069, duration: 325 },
			{ notes: ["b"], time: 38392, duration: 162 },
			
			{ notes: ["a"], time: 39682, duration: 162 },
			{ notes: ["b"], time: 40005, duration: 161 },
			{ notes: ["c"], time: 40327, duration: 163 },
			
			# 22
			{ notes: ["a"], time: 41617, duration: 165 },
			{ notes: ["b"], time: 41940, duration: 163 },
			{ notes: ["c"], time: 42263, duration: 161 },
			
			{ notes: ["d"], time: 46456, duration: 322 },
			{ notes: ["c"], time: 46783, duration: 322 },
			{ notes: ["b"], time: 47100, duration: 161 },
			{ notes: ["a"], time: 47424, duration: 322 },
			{ notes: ["d"], time: 47751, duration: 320 },
			{ notes: ["c"], time: 48069, duration: 320 },
			
			{ notes: ["d"], time: 48393, duration: 320 },
			{ notes: ["c"], time: 48719, duration: 320 },
			{ notes: ["b"], time: 49037, duration: 162 },
			{ notes: ["a"], time: 49359, duration: 328 },
			{ notes: ["d"], time: 49682, duration: 322 },
			{ notes: ["c"], time: 50009, duration: 316 },
			
			# 27
			{ notes: ["d"], time: 54197, duration: 324 },
			{ notes: ["c"], time: 54521, duration: 323 },
			{ notes: ["b"], time: 54842, duration: 161 },
			{ notes: ["a"], time: 55165, duration: 324 },
			{ notes: ["d"], time: 55488, duration: 324 },
			{ notes: ["c"], time: 55811, duration: 325 },
			
			{ notes: ["d"], time: 56134, duration: 323 },
			{ notes: ["c"], time: 56456, duration: 322 },
			{ notes: ["b"], time: 56783, duration: 157 },
			{ notes: ["a"], time: 57101, duration: 322 },
			{ notes: ["d"], time: 57428, duration: 322 },
			{ notes: ["c"], time: 57746, duration: 162 },
			
			{ notes: ["b"], time: 58069, duration: 321 },
			{ notes: ["d"], time: 58714, duration: 325 },
			{ notes: ["b"], time: 59037, duration: 324 },
			{ notes: ["d"], time: 59684, duration: 323 },
			
			# 32
			{ notes: ["b"], time: 60004, duration: 325 },
			{ notes: ["d"], time: 60650, duration: 324 },
			{ notes: ["b"], time: 60972, duration: 323 },
			{ notes: ["d"], time: 61617, duration: 326 },
			
			{ notes: ["b"], time: 61940, duration: 323 },
			{ notes: ["d"], time: 62585, duration: 325 },
			{ notes: ["b"], time: 62908, duration: 322 },
			{ notes: ["d"], time: 63549, duration: 328 },
			
			{ notes: ["b"], time: 63875, duration: 321 },
			{ notes: ["d"], time: 64521, duration: 319 },
			{ notes: ["b"], time: 64838, duration: 343 },
			{ notes: ["d"], time: 65488, duration: 327 },
			
			{ notes: ["b"], time: 65811, duration: 319 },
			{ notes: ["d"], time: 66456, duration: 324 },
			{ notes: ["b"], time: 66777, duration: 328 },
			{ notes: ["d"], time: 67424, duration: 324 },
			
			{ notes: ["b"], time: 67746, duration: 325 },
			{ notes: ["d"], time: 68392, duration: 324 },
			{ notes: ["b"], time: 68714, duration: 325 },
			{ notes: ["d"], time: 69359, duration: 325 },
			
			{ notes: ["b"], time: 69683, duration: 321 },
			{ notes: ["d"], time: 70326, duration: 321 },
			{ notes: ["b"], time: 70651, duration: 321 },
			{ notes: ["d"], time: 71294, duration: 323 },
			
			# 38
			{ notes: ["b"], time: 71617, duration: 322 },
			{ notes: ["d"], time: 72263, duration: 322 },
			{ notes: ["b"], time: 72585, duration: 323 },
			{ notes: ["d"], time: 73230, duration: 323 },
			
			{ notes: ["b"], time: 73553, duration: 323 },
			{ notes: ["d"], time: 74198, duration: 323 },
			{ notes: ["b"], time: 74526, duration: 318 },
			{ notes: ["d"], time: 75166, duration: 322 },
			
			{ notes: ["b"], time: 75495, duration: 315 },
			{ notes: ["d"], time: 76134, duration: 321 },
			{ notes: ["b"], time: 76460, duration: 320 },
			
			{ notes: ["a","c"], time: 77425, duration: 161 },
			{ notes: ["a","c"], time: 78392, duration: 161 },
			
			{ notes: ["a","c"], time: 79363, duration: 164 },
			{ notes: ["a","c"], time: 80327, duration: 161 },
			
			{ notes: ["a","c"], time: 81294, duration: 167 },
			{ notes: ["a","c"], time: 82262, duration: 167 },
			
			# 44
			{ notes: ["a","c"], time: 83230, duration: 159 },
			{ notes: ["b","d"], time: 84198, duration: 162 },
			
			{ notes: ["a","c"], time: 85166, duration: 159 },
			{ notes: ["a","c"], time: 86137, duration: 162 },
			
			{ notes: ["a","c"], time: 87101, duration: 163 },
			{ notes: ["a","c"], time: 88066, duration: 132 },
			
			{ notes: ["a","c"], time: 89038, duration: 158 },
			{ notes: ["a","c"], time: 90004, duration: 170 },
			
			{ notes: ["a","c"], time: 90972, duration: 161 },
			{ notes: ["b","d"], time: 91940, duration: 165 },
	
			{ notes: ["a"], time: 92909, duration: 1937 },
			
			{ notes: ["b"], time: 94843, duration: 1936 },
			
			{ notes: ["c"], time: 96779, duration: 1937 },
			
			# 52
			{ notes: ["d"], time: 98714, duration: 1940 },
			
			{ notes: ["a"], time: 100650, duration: 1938 },
			
			{ notes: ["b"], time: 102585, duration: 900 },
			{ notes: ["c"], time: 103553, duration: 900 },
			
			{ notes: ["d"], time: 104521, duration: 163 },
			{ notes: ["c"], time: 105487, duration: 157 },
			
			{ notes: ["b"], time: 106456, duration: 163 },
			{ notes: ["a"], time: 107425, duration: 156 },
			
			{ notes: ["d"], time: 108391, duration: 162 },
			{ notes: ["c"], time: 109359, duration: 159 },
			
			{ notes: ["b"], time: 110326, duration: 164 },
			{ notes: ["a"], time: 111295, duration: 160 },
			
			# pg 2, 59 
			{ notes: ["a","c"], time: 112264, duration: 166 },
			{ notes: ["a","c"], time: 113230, duration: 159 },
			
			{ notes: ["a","c"], time: 114198, duration: 167 },
			{ notes: ["a","c"], time: 115164, duration: 134 },
			
			{ notes: ["a","c"], time: 116133, duration: 161 },
			{ notes: ["a","c"], time: 117101, duration: 163 },
			
			{ notes: ["a","c"], time: 118069, duration: 160 },
			{ notes: ["b","d"], time: 119037, duration: 160 },
			
			{ notes: ["a","c"], time: 120004, duration: 164 },
			{ notes: ["a","c"], time: 120972, duration: 164 },
			
			{ notes: ["a","c"], time: 121940, duration: 163 },
			{ notes: ["a","c"], time: 122907, duration: 162 },
			
			{ notes: ["a","c"], time: 123874, duration: 164 },
			{ notes: ["a","c"], time: 124843, duration: 161 },
			
			# 66
			{ notes: ["a","c"], time: 125811, duration: 164 },
			{ notes: ["b","d"], time: 126780, duration: 160 },
			
			{ notes: ["a"], time: 127746, duration: 1939 },
			
			{ notes: ["b"], time: 129682, duration: 1938 },
			
			{ notes: ["c"], time: 131617, duration: 1934 },
			
			{ notes: ["d"], time: 133556, duration: 1934 },
			
			{ notes: ["a"], time: 135488, duration: 1936 },
			
			{ notes: ["b"], time: 137424, duration: 900 },
			{ notes: ["c"], time: 138391, duration: 900 },
			
			{ notes: ["d"], time: 139359, duration: 1937 },
			
			{ notes: ["a"], time: 141294, duration: 1937 },
			
			{ notes: ["b"], time: 143230, duration: 1937 },
			
			# 76
			{ notes: ["c"], time: 145327, duration: 1775 },
			
			{ notes: ["a"], time: 166461, duration: 900 },
			{ notes: ["b"], time: 167426, duration: 900 },
			
			{ notes: ["c"], time: 168386, duration: 900 },
			{ notes: ["d"], time: 169359, duration: 900 },
			
			{ notes: ["a"], time: 170328, duration: 900 },
			{ notes: ["b"], time: 171295, duration: 900 },
			
			{ notes: ["c"], time: 172265, duration: 900 },
			{ notes: ["d"], time: 173227, duration: 900 },
			
			{ notes: ["a"], time: 174198, duration: 900 },
			{ notes: ["b"], time: 175165, duration: 900 },
			
			{ notes: ["c"], time: 176126, duration: 900 },
			{ notes: ["d"], time: 177104, duration: 900 },
			
			# 93
			{ notes: ["a"], time: 178068, duration: 900 },
			{ notes: ["b"], time: 179036, duration: 900 },
			{ notes: ["c"], time: 180008, duration: 900 },
			{ notes: ["d"], time: 180972, duration: 900 },
			
			{ notes: ["a"], time: 181936, duration: 164 },
			{ notes: ["b"], time: 182907, duration: 159 },
			
			{ notes: ["c"], time: 183875, duration: 159 },
			{ notes: ["d"], time: 184843, duration: 162 },
			{ notes: ["d"], time: 185488, duration: 163 },
			
			{ notes: ["a"], time: 187746, duration: 163 },
			{ notes: ["b"], time: 188069, duration: 160 },
			{ notes: ["c"], time: 189036, duration: 200 },
			{ notes: ["d"], time: 189359, duration: 161 },
			
			{ notes: ["d"], time: 190649, duration: 326 },
			{ notes: ["a"], time: 191295, duration: 163 },
			
			# 100
			{ notes: ["b"], time: 192587, duration: 330 },
			{ notes: ["d"], time: 193230, duration: 164 },
			
			{ notes: ["b"], time: 193552, duration: 320 },
			{ notes: ["d"], time: 194197, duration: 164 },
			{ notes: ["b"], time: 194520, duration: 324 },
			{ notes: ["d"], time: 195165, duration: 162 },
			
			{ notes: ["b"], time: 195488, duration: 325 },
			{ notes: ["d"], time: 196133, duration: 162 },
			{ notes: ["b"], time: 196456, duration: 322 },
			{ notes: ["d"], time: 197101, duration: 159 },
			
			{ notes: ["a"], time: 197424, duration: 161 },
			{ notes: ["b"], time: 197746, duration: 150 },
			{ notes: ["a"], time: 197907, duration: 160 },
			{ notes: ["c"], time: 198071, duration: 160 },
			{ notes: ["d"], time: 198230, duration: 163 },
			{ notes: ["a"], time: 198391, duration: 162 },
			{ notes: ["b"], time: 198714, duration: 150 },
			{ notes: ["a"], time: 198875, duration: 161 },
			{ notes: ["c"], time: 199036, duration: 162 },
			{ notes: ["d"], time: 199198, duration: 161 },
			
			{ notes: ["a"], time: 199359, duration: 162 },
			{ notes: ["b"], time: 199682, duration: 150 },
			{ notes: ["a"], time: 199843, duration: 163 },
			{ notes: ["c"], time: 200004, duration: 161 },
			{ notes: ["d"], time: 200170, duration: 157 },
			{ notes: ["c"], time: 200327, duration: 160 },
			{ notes: ["b"], time: 200649, duration: 107 },
			{ notes: ["a"], time: 200811, duration: 150 },
			{ notes: ["c"], time: 200972, duration: 150 },
			
			# 106
			{ notes: ["a"], time: 203231, duration: 162 },
			{ notes: ["b"], time: 203398, duration: 153 },
			{ notes: ["c"], time: 203555, duration: 162 },
			{ notes: ["d"], time: 203714, duration: 161 },
			{ notes: ["a"], time: 203883, duration: 153 },
			{ notes: ["b"], time: 204036, duration: 163 },
			{ notes: ["c"], time: 204198, duration: 159 },
			{ notes: ["d"], time: 204360, duration: 162 },
			{ notes: ["a"], time: 204520, duration: 320 },
			{ notes: ["c"], time: 204846, duration: 155 },
			
			{ notes: ["a"], time: 206133, duration: 163 },
			{ notes: ["b"], time: 206294, duration: 164 },
			{ notes: ["c"], time: 206456, duration: 165 },
			{ notes: ["d"], time: 206617, duration: 163 },
			{ notes: ["a"], time: 206778, duration: 164 },
			{ notes: ["c"], time: 206940, duration: 163 },
			
			{ notes: ["a"], time: 208069, duration: 167 },
			{ notes: ["b"], time: 208230, duration: 159 },
			{ notes: ["c"], time: 208395, duration: 158 },
			{ notes: ["d"], time: 208558, duration: 159 },
			{ notes: ["a"], time: 208715, duration: 162 },
			{ notes: ["c"], time: 208875, duration: 150 },
			
			{ notes: ["b"], time: 209036, duration: 326 },
			{ notes: ["d"], time: 209682, duration: 163 },
			{ notes: ["b"], time: 210003, duration: 323 },
			{ notes: ["d"], time: 210649, duration: 161 },
			
			{ notes: ["b"], time: 210971, duration: 327 },
			{ notes: ["d"], time: 211616, duration: 163 },
			{ notes: ["b"], time: 211940, duration: 322 },
			{ notes: ["d"], time: 212585, duration: 162 },
			
			# 111
			{ notes: ["b"], time: 212907, duration: 323 },
			{ notes: ["d"], time: 213553, duration: 159 },
			{ notes: ["b"], time: 213875, duration: 323 },
			{ notes: ["d"], time: 214520, duration: 162 },
			
			{ notes: ["b"], time: 214844, duration: 321 },
			{ notes: ["d"], time: 215488, duration: 161 },
			{ notes: ["b"], time: 215811, duration: 324 },
			{ notes: ["d"], time: 216456, duration: 161 },
			
			{ notes: ["b"], time: 216778, duration: 324 },
			{ notes: ["d"], time: 217424, duration: 150 },
			{ notes: ["b"], time: 217746, duration: 323 },
			{ notes: ["d"], time: 218391, duration: 160 },
			
			{ notes: ["b"], time: 218714, duration: 323 },
			{ notes: ["d"], time: 219359, duration: 161 },
			{ notes: ["b"], time: 219683, duration: 320 },
			{ notes: ["d"], time: 220327, duration: 150 },
			
			{ notes: ["b"], time: 220649, duration: 324 },
			{ notes: ["d"], time: 221294, duration: 161 },
			{ notes: ["b"], time: 221617, duration: 323 },
			{ notes: ["d"], time: 222262, duration: 161 },
			
			{ notes: ["b"], time: 222584, duration: 325 },
			{ notes: ["d"], time: 223230, duration: 160 },
			{ notes: ["b"], time: 223553, duration: 323 },
			{ notes: ["d"], time: 224198, duration: 161 },
			
			# 117
			{ notes: ["a","c"], time: 224520, duration: 162 },
			{ notes: ["b","d"], time: 225488, duration: 162 },
			
			{ notes: ["a","c"], time: 226456, duration: 163 },
			{ notes: ["b","d"], time: 227423, duration: 161 },
			
			{ notes: ["a","b","c","d"], time: 228390, duration: 3551 },
			{ notes: ["a","b","c","d"], time: 232262, duration: 162 }
			]