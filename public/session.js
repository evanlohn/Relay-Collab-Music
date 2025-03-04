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
            scoreDiv.style.height = "150px";
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
        body: JSON.stringify(userScoreStatus)
    }).then(response => response.json())
    .then(data => {
        if (! data.users) {
            return;
        }
        data.users.forEach(participant => {
            const div = document.getElementById("score-" + participant.id);
            if (! div) {
                return;
            }
            userScoreStatus[participant.id] = participant.numSamples;
            renderScore("score-" + participant.id, participant.clef, participant.sample);
        });
    });
}

function renderScore(elementId, clef, sample) {
    const div = document.getElementById(elementId);
    const renderer = new Vex.Flow.Renderer(div, Vex.Flow.Renderer.Backends.SVG);
    renderer.resize(200, 150);
    const context = renderer.getContext();
    const stave = new Vex.Flow.Stave(10, 40, 180);

    stave.addClef(clef).setContext(context).draw();
    const notes = [];

    let magentaNote;
    let spq = sample.quantizationInfo.stepsPerQuarter;
  
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
      notes.push(genStaveNote(magentaNote, spq));
    }
    let timeAtEnd = sample.totalQuantizedSteps - magentaNote.quantizedEndStep;
    if (timeAtEnd > 0) {
      notes.push(getStaveRest(timeAtEnd, spq));
    }
    const beams = Vex.Flow.Beam.generateBeams(notes);
  
    console.log(notes);
  
    const voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4 });
    voice.addTickables(notes);
  
    Vex.Flow.Formatter.FormatAndDraw(context, stave, notes);
    beams.forEach((b) => {
      b.setContext(context).draw();
    });
  
    // Render voice
    // div.innerHTML = "";
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
  
  function genStaveNote(magentaNote, spq) {
    let noteName = pitchToVexFlowKey(magentaNote.pitch);
    let duration = getVexDuration(magentaNote.quantizedEndStep - magentaNote.quantizedStartStep, spq);
    let dotted = duration[duration.length - 1] === 'd';
    let sharp = noteName[1] === '#';
  
    let staveNote = new Vex.Flow.StaveNote({
      keys: [noteName],
      duration: duration
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
  
  // TODO: handle missing durations
  function getVexDuration(steps, stepsPerQuarter) {
      const quarter = stepsPerQuarter;
      const durations = { 1: "16", 2: "8", 3: "8d", 4: "q", 6: "qd", 8: "h", 12: "hd", 16: "w" };
      return durations[steps] || "q"; // Default to quarter note if unknown
  }