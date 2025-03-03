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