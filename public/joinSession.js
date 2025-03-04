
document.addEventListener("DOMContentLoaded", () => {
	addListener();
})

function addListener() {
	document.getElementById("join-form").addEventListener("submit", function(event) {
            event.preventDefault(); // Prevent default form submission

            const name = document.getElementById("name").value || ":0";
            const clef = document.getElementById("clef").value || 0;
            const sessionCode = document.getElementById("session-code").value;

            // Construct the request payload
            const data = { name, clef, sessionCode };

            fetch("/sessions/join-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Failed to join session");
                }
                return response.json();
            })
            .then(result => {
                const userId = result.userId;
                window.location.href = "/waitingRoom/" + sessionCode + "?userId=" + userId;
            })
            .catch(error => {
                console.error("Error:", error);
            });
        });
}