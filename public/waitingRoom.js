document.addEventListener("DOMContentLoaded", function() {
    setInterval(checkSessionStatus, 3000);  // start polling
});

function checkSessionStatus() {
    fetch("/sessions/session-status") 
        .then(response => response.json())
        .then(data => {
            if (data.started) {
                window.location.href = "/session/" + sessionId; // Redirect when session starts
            }
        })
        .catch(error => console.error("Error checking session status:", error));
}