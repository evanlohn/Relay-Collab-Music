
function host() {
	document.getElementById("host-button").disabled = true;
	fetch("/sessions/create-session", {
		method: "POST",
		headers: {
            "Content-Type": "application/json"
        }
	}).then(response => response.json())
	.then(result => {
		let sessionId = result.id.toString();
		window.location.href = `/start/${sessionId}`;
	});
}

function join() {
	window.location.href = `/join`;
}