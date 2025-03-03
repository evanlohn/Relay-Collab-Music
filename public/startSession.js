document.addEventListener("DOMContentLoaded", function() {
    setInterval(pollForParticipants, 3000);
});

function pollForParticipants() {
    const participantsDisplay = document.getElementById("participants-count");

    fetch("/sessions/participants/" + sessionId, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => response.json()).then(result => { 
        participantsDisplay.innerText = result.count;
    });
}

function startSession() {
    console.log("start session");
}