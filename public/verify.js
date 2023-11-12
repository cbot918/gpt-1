// Inside your verify.js or equivalent
document
  .getElementById("verify-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    const password = document.getElementById("verify-key").value;
    // Send the key to the server for verification
    const response = await fetch("/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();
    if (data) {
      window.location.href = "/chat"; // If verified, redirect to the chat page
    } else {
      alert("Incorrect key.");
    }
  });
