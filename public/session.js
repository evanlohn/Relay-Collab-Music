document.addEventListener("DOMContentLoaded", function() {
    getParticipants();
    startPolling();
});

let userScoreStatus = {};

function startPolling() {
    setInterval(getScore, 3000); 
}

function getParticipants() {
    const container = document.getElementById("participants-container");
    container.innerHTML = "";

    fetch("/sessions/participants/" + sessionId) // Fetch participant data
    .then(response => response.json())
    .then(data => {
        data.forEach(participant => {
            userScoreStatus[participant.id] = 0;

            const column = document.createElement("div");
            column.className = "col p-3 border";
            column.style.backgroundColor = participant.id === userId ? "#e0f7fa" : "#ffffff";

            const nameHeader = document.createElement("h3");
            nameHeader.innerText = participant.name;
            column.appendChild(nameHeader);

            const scoreDiv = document.createElement("div");
            scoreDiv.id = "score-" + participant.id;
            scoreDiv.style.height = "500px";
            column.appendChild(scoreDiv);

            container.appendChild(column);
        });
    });
}

function getScore() {
    // fetch score data with a post request containing userScoreStatus
    fetch("/sessions/score/" + sessionId, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userScoreStatus: userScoreStatus,
            userId: userId
        })
    }).then(response => response.json())
    .then(data => {
        data.users?.forEach(participant => {
            const div = document.getElementById("score-" + participant.id);
            if (! div) {
                return;
            }
            userScoreStatus[participant.id] = participant.numSamples;
            div.innerHTML = "";
            renderScore(div, participant.clef, participant.sample);
        });
        if (data.choices) {
            const columnDiv = document.getElementById("score-" + data.otherUserId);
            if (! columnDiv) {
                return;
            }
            columnDiv.innerHTML = "";
            let choiceButtons = [];
            data.choices.forEach((sample, sampleIndex) => {
                // create a wrapper div
                const wrapperDiv = document.createElement("div");
                wrapperDiv.className = "score-wrapper d-flex align-items-center";

                // create a div to render the score and set an onclick that makes a post request to /sessions/submit-choice
                // create a div to render the score
                const scoreDiv = document.createElement("div");
                renderScore(scoreDiv, 'treble', sample);
                wrapperDiv.appendChild(scoreDiv);

                const button = document.createElement("button");
                choiceButtons.push(button);
                button.className = "btn btn-outline-primary m-2";
                button.innerText = "Choose";
                
                button.onclick = () => {
                    choiceButtons.forEach(b => b.disabled = true);
                    fetch("/sessions/make-decision", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            sessionId: sessionId,
                            chooserId: userId,
                            userId: data.otherUserId,
                            choices: data.choices,
                            choiceInd: sampleIndex,
                            rerolls: [] // TODO: implement rerolls and add here
                        })
                    });
                };
                wrapperDiv.appendChild(button);

                // append the wrapper div to columnDiv
                columnDiv.appendChild(wrapperDiv);
            });
        }
    });
}

function renderScore(div, clef, sample) {
    const renderer = new Vex.Flow.Renderer(div, Vex.Flow.Renderer.Backends.SVG);
    renderer.resize(400, 120);
    const context = renderer.getContext();
    const stave = new Vex.Flow.Stave(10, 40, 300, { space_above_staff_ln: 2 });

    stave.addClef(clef).setContext(context).draw();
    const notes = [];

    let magentaNote;
    let spq = sample.quantizationInfo.stepsPerQuarter;
  
    transposeSampleToClef(sample, clef);

    if (sample.notes) {
      let timeAtBeginning = sample.notes[0].quantizedStartStep;
      if (timeAtBeginning > 0) {
        notes.push(getStaveRest(timeAtBeginning, spq));
      }
    }
  
    for (let i = 0; i < sample.notes.length; i += 1) {
      // check for a rest before this note
      magentaNote = sample.notes[i];
      if (i !== 0) {
        let lastMagentaNote = sample.notes[i - 1];
        let timeBetweenNotes = magentaNote.quantizedStartStep - lastMagentaNote.quantizedEndStep; 
        if (timeBetweenNotes > 0) {
          notes.push(getStaveRest(timeBetweenNotes, spq));
        }
      }
      notes.push(genStaveNote(magentaNote, clef, spq));
    }
    let timeAtEnd = sample.totalQuantizedSteps - magentaNote.quantizedEndStep;
    if (timeAtEnd > 0) {
      notes.push(getStaveRest(timeAtEnd, spq));
    }
    const beams = Vex.Flow.Beam.generateBeams(notes);

  
    const voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4 });
    voice.addTickables(notes);
  
    Vex.Flow.Formatter.FormatAndDraw(context, stave, notes);
    beams.forEach((b) => {
      b.setContext(context).draw();
    });
  
    voice.draw(context, stave);
}

function getStaveRest(quantizedDuration, spq) {
    let duration = getVexDuration(quantizedDuration, spq);
    let dotted = duration[duration.length - 1] === 'd';
    let staveRest = new Vex.Flow.StaveNote({
      keys: ["r/4"],
      duration: duration + "r"
    });
    if (dotted) {
      return addDot(staveRest);
    } else {
      return staveRest;
    }
  }
  
  function genStaveNote(magentaNote, clef, spq) {
    let noteName = pitchToVexFlowKey(magentaNote.pitch);
    let duration = getVexDuration(magentaNote.quantizedEndStep - magentaNote.quantizedStartStep, spq);
    let dotted = duration[duration.length - 1] === 'd';
    let sharp = noteName[1] === '#';
  
    let staveNote = new Vex.Flow.StaveNote({
      keys: [noteName],
      duration: duration,
      clef: clef
    });
    if (dotted) {
      staveNote = addDot(staveNote);
    }
    if (sharp) {
      staveNote = staveNote.addModifier(new Vex.Flow.Accidental('#'));
    }
    return staveNote;
  }
  
  function addDot(staveNote) {
      Vex.Flow.Dot.buildAndAttach([staveNote], {
        all: true,
      })
      return staveNote;
  }
  
  function pitchToVexFlowKey(pitch) {
      const octave = Math.floor(pitch / 12) - 1;
      const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
      return `${noteNames[pitch % 12]}/${octave}`;
  }
  
  function getVexDuration(steps, stepsPerQuarter) {
      const quarter = stepsPerQuarter;
      const durations = { 1: "16", 2: "8", 3: "8d", 4: "q", 6: "qd", 8: "h", 12: "hd", 16: "w" };
      return durations[steps] || "q"; // Default to quarter note if unknown
  }

  function transposeSampleToClef(sample, clef) {
    const clefRanges = {
        treble: { min: 60, max: 84 }, // C4 to C6
        bass: { min: 36, max: 60 },   // C2 to C4
        alto: { min: 48, max: 72 }    // C3 to C5
    };

    const range = clefRanges[clef];
    if (!range) return;

    const pitches = sample.notes.map(note => note.pitch);
    const optimalTranspose = findOptimalTranspose(pitches, range.min, range.max);

    sample.notes.forEach(note => {
        note.pitch += optimalTranspose;
    });
}

function findOptimalTranspose(pitches, minPitch, maxPitch) {
    const octave = 12;
    let bestShift = 0;
    let bestFit = Number.MAX_SAFE_INTEGER;

    for (let shift = -2 * octave; shift <= 2 * octave; shift += octave) {
        let outOfRangeCount = 0;
        pitches.forEach(pitch => {
            const transposedPitch = pitch + shift;
            if (transposedPitch < minPitch || transposedPitch > maxPitch) {
                outOfRangeCount++;
            }
        });

        if (outOfRangeCount < bestFit) {
            bestFit = outOfRangeCount;
            bestShift = shift;
        }
    }

    return bestShift;
}