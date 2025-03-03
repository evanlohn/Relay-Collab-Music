document.addEventListener("DOMContentLoaded", function() {
    setInterval(pollForParticipantsAndModelStatus, 3000);
});

function pollForParticipantsAndModelStatus() {
    const participantsDisplay = document.getElementById("participants-count");
    const startButton = document.getElementById("start-button");

    fetch("/sessions/participants/" + sessionId, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => response.json()).then(result => { 
        participantsDisplay.innerText = result.count;
        if (result.modelInitialized) {
            startButton.disabled = false;
        }
    });
}

function startSession() {
    fetch("/sessions/start-session", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ sessionId })
    }).then(response => {
        if (response.status === 200) {
            window.location.href = "/session/" + sessionId;
        }
    });
}