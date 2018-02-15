var audioContext = null;
var meter = null;
var rafID = null;

function createAudioMeter(audioContext,clipLevel,averaging,clipLag) {
	var processor = audioContext.createScriptProcessor(512);
	processor.onaudioprocess = volumeAudioProcess;
	processor.clipping = false;
	processor.lastClip = 0;
	processor.volume = 0;
	processor.clipLevel = clipLevel || 0.98;
	processor.averaging = averaging || 0.5;
	processor.clipLag = clipLag || 750;

	// this will have no effect, since we don't copy the input to the output,
	// but works around a current Chrome bug.
	processor.connect(audioContext.destination);

	processor.checkClipping =
		function(){
			if (!this.clipping)
				return false;
			if ((this.lastClip + this.clipLag) < window.performance.now())
				this.clipping = false;
			return this.clipping;
		};

	processor.shutdown =
		function(){
			this.disconnect();
			this.onaudioprocess = null;
		};

	return processor;
}

function volumeAudioProcess( event ) {
	var buf = event.inputBuffer.getChannelData(0);
  var bufLength = buf.length;
	var sum = 0;
  var x;

	// Do a root-mean-square on the samples: sum up the squares...
  for (var i=0; i<bufLength; i++) {
    x = buf[i];
    if (Math.abs(x)>=this.clipLevel) {
      this.clipping = true;
      this.lastClip = window.performance.now();
    }
    sum += x * x;
  }

  // ... then take the square root of the sum.
  var rms =  Math.sqrt(sum / bufLength);

  // Now smooth this out with the averaging factor applied
  // to the previous sample - take the max here because we
  // want "fast attack, slow release."
  this.volume = Math.max(rms, this.volume*this.averaging);
}

window.onload = function getAudioStream() {
    // monkeypatch Web Audio
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
	
    // grab an audio context
    audioContext = new AudioContext();

    // Attempt to get audio input
    try {
        // monkeypatch getUserMedia
        navigator.getUserMedia = 
        	navigator.getUserMedia ||
        	navigator.webkitGetUserMedia ||
        	navigator.mozGetUserMedia;

        // ask for an audio input
        navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        }, gotStream, didntGetStream);
    } catch (e) {
        alert('getUserMedia() threw exception :' + e);
    }

}


function didntGetStream() {
    alert('Stream generation failed from getUserMedia().');
}

var mediaStreamSource = null;

function gotStream(stream) {
    // Create an AudioNode from the stream.
    /*mediaStreamSource = audioContext.createMediaStreamSource(stream);
    //var audio = document.getElementById("myAudio");
 
    // Create a new volume meter and connect it.
    meter = createAudioMeter(audioContext);
    mediaStreamSource.connect(meter);

    // kick off the visual updating
    drawLoop(); */
}

function drawLoop( time ) {
    // Reset mouth to original position
    resetMouth();

    // Get the current volume (typically 0 - 1.0) and increase it
    openMouth = meter.volume*500
    
    // Control the max pixels the mouth can get lowered
    if(openMouth > 60){
      openMouth = 60;
    }
    else if(openMouth < 2){
      openMouth = 0;
    }
    
    // Lower the mouth based on the current volume of the audio source
    $("#mouth").css('top', '+=' + openMouth + 'px');
    
    // set up the next visual callback
    rafID = window.requestAnimationFrame( drawLoop );
}

function resetMouth(){
  $("#mouth").css("top", "152px");
}

window.onload = function() {
  // Create AudioContext and buffer source
  var audioCtx = new AudioContext();
  source = audioCtx.createBufferSource();

  // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
  var scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);

  // load in an audio track via XHR and decodeAudioData
  function getData() {
    request = new XMLHttpRequest();
    request.open('GET', 'fakkingsrs.mp3', true);
    request.responseType = 'arraybuffer';
    request.onload = function() {
      var audioData = request.response;

      audioCtx.decodeAudioData(audioData, function(buffer) {
        myBuffer = buffer;   
        source.buffer = myBuffer;
      },
      function(e){"Error with decoding audio data" + e.err});
    }
    request.send();
  }

  // Give the node a function to process audio events
  scriptNode.onaudioprocess = function(audioProcessingEvent) {
    // The input buffer is the song we loaded earlier
    var inputBuffer = audioProcessingEvent.inputBuffer;

    // The output buffer contains the samples that will be modified and played
    var outputBuffer = audioProcessingEvent.outputBuffer;

    // Loop through the output channels (in this case there is only one)
    for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      var inputData = inputBuffer.getChannelData(channel);
      var outputData = outputBuffer.getChannelData(channel);

      // Loop through the 4096 samples
      for (var sample = 0; sample < inputBuffer.length; sample++) {
        // make output equal to the same as the input
        outputData[sample] = inputData[sample];

        outputData[sample] += ((Math.random() * 2) - 1) * 0.2; 
      }
    }
  }

  getData();
  
  var playButton = document.querySelector('button');
  
  // wire up play button
  playButton.onclick = function() {
    source.connect(scriptNode);
    scriptNode.connect(audioCtx.destination);
    source.start();
  }
  
  // When the buffer source stops playing, disconnect everything
  source.onended = function() {
    source.disconnect(scriptNode);
    scriptNode.disconnect(audioCtx.destination);
  }
}









