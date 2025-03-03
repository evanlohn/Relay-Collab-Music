
data = {
    participants: [
        {
            userId: "my-unique-id",
            name: "Beccy",
        },
        {
            userId: "abc",
            name: "Ivy",
        },
        {
            userId: "def",
            name: "Mac",
        },
    ]
}

document.addEventListener("DOMContentLoaded", function() {
    startPolling();

});

function startPolling() {
    setInterval(getParticipants, 3000); 
}

function getParticipants() {
    fetch("/sessions/get-session") // Fetch participant data
    .then(response => response.json())
    .then(data => {

    });
    const userId = "my-unique-id";

    const container = document.getElementById("participants-container");
    container.innerHTML = "";
    
    data.participants.forEach(participant => {
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
        
        renderScore("score-" + participant.id);
    });
}

function renderScore(elementId) {
    const VF = Vex.Flow;
    const div = document.getElementById(elementId);
    const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    renderer.resize(200, 150);
    const context = renderer.getContext();
    const stave = new VF.Stave(10, 40, 180);
    stave.addClef("treble").setContext(context).draw();
    const notes = [new VF.StaveNote({ keys: ["c/4"], duration: "q" })];
    const voice = new VF.Voice({ num_beats: 1, beat_value: 4 });
    voice.addTickables(notes);
    new VF.Formatter().joinVoices([voice]).format([voice], 150);
    voice.draw(context, stave);
}