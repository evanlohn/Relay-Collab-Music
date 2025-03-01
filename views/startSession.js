let participants = 0;

document.addEventListener("DOMContentLoaded", function() {
    setSessionCode();
    pollForParticipants();
});

function setSessionCode() {
    document.getElementById("session-code").innerText = Math.floor(100000 + Math.random() * 900000);
}

function pollForParticipants() {
    const participantsDisplay = document.getElementById("participants-count");

    setInterval(() => {
        participants++;
        participantsDisplay.innerText = participants;
    }, 3000);
}

function startSession() {
    console.log("start session");
}