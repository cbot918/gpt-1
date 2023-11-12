async function sendMessage() {
  const inputField = document.getElementById("user-input");
  const loadingIndicator = document.getElementById("loading-indicator");
  const chatSettings = document.getElementById("chat-settings"); // 获取 select 元素
  const userMessage = inputField.value.trim();
  const selectedSetting = chatSettings.value; // 获取用户选择的设置

  if (userMessage) {
    // Display user message in the chat box
    addToChatBox("User", userMessage);

    // Show loading indicator
    loadingIndicator.style.display = "flex";

    // 发送消息及用户选择的设置到服务器
    const response = await fetch("/api/chat-completion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userMessage, prompt: selectedSetting }),
    });

    // Hide loading indicator
    loadingIndicator.style.display = "none";

    if (!response.ok) {
      console.error("Error in API response");
      return;
    }

    const data = await response.json();
    // Assuming the server returns the AI's response in data.answer
    addToChatBox("AI", data.answer);

    // Clear the input field
    inputField.value = "";
  }
}

function addToChatBox(sender, message) {
  const chatBox = document.getElementById("chat-box");
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");

  const senderNameSpan = document.createElement("span");
  senderNameSpan.classList.add("sender-name");
  senderNameSpan.textContent = sender.toUpperCase() + ":";

  const messageContentSpan = document.createElement("span");
  messageContentSpan.classList.add("message-content");
  messageContentSpan.textContent = message;

  messageDiv.appendChild(senderNameSpan);
  messageDiv.appendChild(messageContentSpan);

  if (sender === "User") {
    messageDiv.classList.add("user");
  } else {
    messageDiv.classList.add("ai");
  }

  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 当文件输入变化时调用此函数以显示文件名
function showFileName() {
  const fileInput = document.getElementById("file-input");
  const fileNameDisplay = document.getElementById("file-name");

  // 检查是否有文件被选中
  const file = fileInput.files[0];
  if (file) {
    fileNameDisplay.textContent = file.name;
  }
}
function uploadFile() {
  const fileInput = document.getElementById("file-input");
  const fileNameDisplay = document.getElementById("file-name");

  // 检查是否有文件被选中
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a file first.");
    return;
  }

  const formData = new FormData();
  formData.append("jsonFile", file);

  fetch("/api/upload-json", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((result) => {
      // 更新 select 元素
      document.getElementById("chat-settings-container").innerHTML =
        result.selectHtml;

      // 清空文件输入和文件名显示
      fileInput.value = "";
      fileNameDisplay.textContent = "";
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
