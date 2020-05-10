    var audio = {
        buffer: {},
        compatibility: {},
        files: [
            "sounds/synth.wav",
            "sounds/drums.wav",
            "sounds/bass.wav",
            "sounds/lead.wav",
            "sounds/pad.wav"
        ],
        proceed: true,
        source_loop: {},
        source_once: {}
    };

    audio.findSync = function(n) {
        var first = 0,
            current = 0,
            offset = 0;

        for (var i in audio.source_loop) {
            current = audio.source_loop[i]._startTime;
            if (current > 0) {
                if (current < first || first === 0) {
                    first = current;
                }
            }
        }

        if (audio.context.currentTime > first) {
            offset = (audio.context.currentTime - first) % audio.buffer[n].duration;
        }

        return offset;
    };

    audio.play = function(n) {
        if (audio.source_loop[n]._playing) {
            audio.stop(n);
        } else {
            audio.source_loop[n] = audio.context.createBufferSource();
            audio.source_loop[n].buffer = audio.buffer[n];
            audio.source_loop[n].loop = true;
            audio.source_loop[n].connect(audio.context.destination);

            var offset = audio.findSync(n);
            audio.source_loop[n]._startTime = audio.context.currentTime;

            if (audio.compatibility.start === 'noteOn') {
                 
                
                audio.source_once[n] = audio.context.createBufferSource();
                audio.source_once[n].buffer = audio.buffer[n];
                audio.source_once[n].connect(audio.context.destination);
                audio.source_once[n].noteGrainOn(0, offset, audio.buffer[n].duration - offset); // currentTime, offset, duration

                audio.source_loop[n][audio.compatibility.start](audio.context.currentTime + (audio.buffer[n].duration - offset));
            } else {
                audio.source_loop[n][audio.compatibility.start](0, offset);
            }

            audio.source_loop[n]._playing = true;
        }
    };

    audio.stop = function(n) {
        if (audio.source_loop[n]._playing) {
            audio.source_loop[n][audio.compatibility.stop](0);
            audio.source_loop[n]._playing = false;
            audio.source_loop[n]._startTime = 0;
            if (audio.compatibility.start === 'noteOn') {
                audio.source_once[n][audio.compatibility.stop](0);
            }
        }
    };

    try {

        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audio.context = new window.AudioContext();
    } catch(e) {
        audio.proceed = false;
        alert('Web Audio API not supported in this browser.');
    }

    if (audio.proceed) {
        (function() {
            var start = 'start',
                stop = 'stop',
                buffer = audio.context.createBufferSource();

            if (typeof buffer.start !== 'function') {
                start = 'noteOn';
            }
            audio.compatibility.start = start;

            if (typeof buffer.stop !== 'function') {
                stop = 'noteOff';
            }
            audio.compatibility.stop = stop;
        })();

        for (var a in audio.files) {
            (function() {
                var i = parseInt(a) + 1;
                var req = new XMLHttpRequest();
                req.open('GET', audio.files[i - 1], true); // array starts with 0 hence the -1
                req.responseType = 'arraybuffer';
                req.onload = function() {
                    audio.context.decodeAudioData(
                        req.response,
                        function(buffer) {
                            audio.buffer[i] = buffer;
                            audio.source_loop[i] = {};
                            var button = document.getElementById('button-loop-' + i);
                            button.addEventListener('click', function(e) {
                                e.preventDefault();
                                audio.play(this.value);
                            });
                        },
                        function() {
                            console.log('Error decoding audio "' + audio.files[i - 1] + '".');
                        }
                    );
                };
                req.send();
            })();
        }
    }