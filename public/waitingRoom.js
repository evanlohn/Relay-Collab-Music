document.addEventListener("DOMContentLoaded", function() {
    setInterval(checkSessionStatus, 3000);  // start polling
});

function checkSessionStatus() {
    fetch("/sessions/session-status/" + sessionId) 
        .then(response => response.json())
        .then(data => {
            if (data.startedAt) {
                window.location.href = "/session/" + sessionId + "?userId=" + userId; // Redirect when session starts
            }
        })
        .catch(error => console.error("Error checking session status:", error));
}