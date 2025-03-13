document.getElementById('loadSession').addEventListener('click', () => {
    const sessionId = document.getElementById('sessionId').value;
    if (!sessionId) {
        alert('Please enter a session ID');
        return;
    }

    fetch(`/admin/session/${sessionId}`)
        .then(response => response.json())
        .then(data => {
            displaySessionData(data);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to load session data');
        });
});

function displaySessionData(data) {
    const sessionDataDiv = document.getElementById('sessionData');
    sessionDataDiv.innerHTML = '';

    if (!data.session) {
        sessionDataDiv.innerHTML = '<p>Session not found</p>';
        return;
    }

    const sessionInfo = document.createElement('div');
    sessionInfo.innerHTML = `
        <h2>Session ID: ${data.session.id}</h2>
        <p>Created At: ${new Date(data.session.createdAt).toLocaleString()}</p>
        <p>Started At: ${data.session.startedAt ? new Date(data.session.startedAt).toLocaleString() : 'Not started'}</p>
    `;
    sessionDataDiv.appendChild(sessionInfo);

    const gridContainer = document.createElement('div');

    const colors = ["#aeebba","#d7bdf2","#edd9b7","#fbfbc0","#f0c3ce","#bae1f0"];
    const userColors = {};
    const userScores = {};
    const arrowPairs = [];

    // Create header row
    const headerRow = document.createElement('div');
    headerRow.className = 'row';

    data.users.forEach((user, index) => {
        const userHeader = document.createElement('div');
        userHeader.className = 'col grid-cell';
        userHeader.innerHTML = `<h4>${user.name}</h4>`;
        userHeader.style.backgroundColor = colors[index % colors.length];
        userColors[user.id] = colors[index % colors.length];
        userScores[user.id] = [];
        headerRow.appendChild(userHeader);
    });
    gridContainer.appendChild(headerRow);

    // Create the first row for initial scores
    const initialRow = document.createElement('div');
    initialRow.className = 'row';


    data.users.forEach(user => {
        const scoreDiv = document.createElement('div');
        const scoreId = `score-${user.id}-0`;
        scoreDiv.id = scoreId;
        renderScore(scoreDiv, user.clef, user.score[0]);
        const userCol = document.createElement('div');
        userCol.className = 'col grid-cell';
        userCol.appendChild(scoreDiv);
        initialRow.appendChild(userCol);
        userScores[user.id].push({ id: scoreId, sample: user.score[0] });
    });
    gridContainer.appendChild(initialRow);

    // Create rows for each decision
    data.decisions.forEach((decision, index) => {
        const decisionRow = document.createElement('div');
        decisionRow.className = 'row';

        data.users.forEach(user => {
            const userCol = document.createElement('div');
            userCol.className = 'col grid-cell';
            if (user.id === decision.otherUserId) {
                const scoreDiv = document.createElement('div');
                const scoreId = `score-${user.id}-${index + 1}`;
                scoreDiv.id = scoreId;
                const chosenScore = decision.choiceOptions[decision.choiceIndex];
                renderScore(scoreDiv, user.clef, chosenScore);
                userCol.appendChild(scoreDiv);
                userCol.style.backgroundColor = userColors[decision.chooserId];
                decisionRow.appendChild(userCol);

                // Check if the chosen score matches any of the chooser's score pieces
                const chooserScores = userScores[decision.chooserId];
                const matchingScore = chooserScores.find(score => areSamplesEqual(score.sample, chosenScore));
                if (matchingScore) {
                    arrowPairs.push({ from: matchingScore.id, to: scoreId, fromColor: userColors[decision.chooserId], toColor: userColors[decision.otherUserId] });
                }

                // Store the new score piece
                userScores[user.id].push({ id: scoreId, sample: chosenScore });
            } else {
                decisionRow.appendChild(userCol);
            }
        });
        gridContainer.appendChild(decisionRow);
    });

    sessionDataDiv.appendChild(gridContainer);

    // Draw arrows
    arrowPairs.forEach(pair => {
        new LeaderLine(
            document.getElementById(pair.from),
            document.getElementById(pair.to),
            {
                startPlugColor: pair.fromColor,
                endPlugColor: pair.toColor,
                gradient: true
             }
        );
    });
}

function renderScore(div, clef, sample) {
    const renderer = new Vex.Flow.Renderer(div, Vex.Flow.Renderer.Backends.SVG);
    renderer.resize(400, 120);
    const context = renderer.getContext();
    const stave = new Vex.Flow.Stave(10, 40, 300, { space_above_staff_ln: 2 });

    stave.addClef(clef).setContext(context).draw();

    const notes = generateNotes(sample, clef);
    const voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4 });
    if (notes.length > 0) {
        const beams = Vex.Flow.Beam.generateBeams(notes);
        voice.addTickables(notes);
        Vex.Flow.Formatter.FormatAndDraw(context, stave, notes);
        beams.forEach((b) => b.setContext(context).draw());
    }

    if (sample.type === "IMPROVISE") {
        // use StaveText to write "improvise" above the staff
        const text = new Vex.Flow.StaveText("Improvise", Vex.Flow.ModifierPosition.ABOVE, { shift_y: 20, shift_x: -50 });
        text.setContext(context).setStave(stave);
        text.draw(stave);
    }
  
    voice.draw(context, stave);
}

function generateNotes(sample, clef) {
    const notes = [];
    if (sample.notes) {
        let transposedSample = JSON.parse(JSON.stringify(sample));
        transposeSampleToClef(transposedSample, clef);

        let magentaNote;
        let spq = sample.quantizationInfo.stepsPerQuarter;

        let timeAtBeginning = sample.notes[0].quantizedStartStep;
        if (timeAtBeginning > 0) {
            notes.push(getStaveRest(timeAtBeginning, spq));
        }

        for (let i = 0; i < transposedSample.notes.length; i += 1) {
            magentaNote = transposedSample.notes[i];
            if (i !== 0) {
                let lastMagentaNote = transposedSample.notes[i - 1];
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
    }
    return notes;
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
    Vex.Flow.Dot.buildAndAttach([staveNote], { all: true });
    return staveNote;
}

function pitchToVexFlowKey(pitch) {
    const octave = Math.floor(pitch / 12) - 1;
    const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
    return `${noteNames[pitch % 12]}/${octave}`;
}

function getVexDuration(steps, stepsPerQuarter) {
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

function areSamplesEqual(sample1, sample2) {
    if (! sample1.notes || ! sample2.notes) {
        return false;
    }
    if (sample1.notes.length !== sample2.notes.length) {
        return false;
    }
    for (let i = 0; i < sample1.notes.length; i++) {
        if (sample1.notes[i].pitch !== sample2.notes[i].pitch ||
            sample1.notes[i].quantizedStartStep !== sample2.notes[i].quantizedStartStep ||
            sample1.notes[i].quantizedEndStep !== sample2.notes[i].quantizedEndStep) {
            return false;
        }
    }
    return true;
}