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

var audioContext = null;
var srsContext = null;
var meter = null;
var rafID = null;
var audio = document.querySelector('audio');

window.onload = function() {

    // grab our canvas
    canvasContext = document.getElementById( "mouth" );
	
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
        alert('getUserMedia threw exception :' + e);
    }

}


function didntGetStream() {
    alert('Stream generation failed.');
}

var mediaStreamSource = null;

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    //var audio = document.getElementById("myAudio");


    /*audio.srcObject = stream;
    audioFileContext = new AudioContext();
    audioFileStreamSource = audioFileContext.createMediaStreamSource(stream); 
    meter = createAudioMeter(audioFileContext);
    audioFileStreamSource.connect(meter);
    audioFileContext*/
 
    // Create a new volume meter and connect it.
    meter = createAudioMeter(audioContext);
    mediaStreamSource.connect(meter);

    // kick off the visual updating
    //audio.play();
    drawLoop();
}

function drawLoop( time ) {
    // Reset mouth to original position
    resetMouth();

    // Get the current volume (typically 0 - 1.0) and increase it
    openMouth = meter.volume*500
    
    // Control the max pixels the mouth can get lowered
    if(openMouth > 40){
      openMouth = 40;
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
  //$("#mouth").css("top", " 77.5%");
  $("#mouth").css("top", " 85%");
}
