
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
            console.log(data);

            // fetch("/join-session", {
            //     method: "POST",
            //     headers: {
            //         "Content-Type": "application/json"
            //     },
            //     body: JSON.stringify(data)
            // })
            // .then(response => response.json())
            // .then(result => {
            //     console.log("Success:", result);
            //     // Redirect or update UI based on response
            // })
            // .catch(error => {
            //     console.error("Error:", error);
            // });
        });
}