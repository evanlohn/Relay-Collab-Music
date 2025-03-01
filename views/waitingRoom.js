document.addEventListener("DOMContentLoaded", function() {
    setInterval(checkSessionStatus, 3000);  // start polling
});

function checkSessionStatus() {
    console.log("session not started");
    // fetch("/session-status") 
    //     .then(response => response.json())
    //     .then(data => {
    //         if (data.started) {
    //             window.location.href = "/session"; // Redirect when session starts?
    //         }
    //     })
    //     .catch(error => console.error("Error checking session status:", error));
}