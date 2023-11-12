// Step 1: 引入模塊
import express from "express";
import expressSession from "express-session";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
// Step 2: 設置常量
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 確保日誌資料夾存在
const logDirectory = path.join(__dirname, "log");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// 獲取當天的日期，格式為 YYYY-MM-DD
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// 函數用於讀取指定 prompt 的 JSON 文件
function readJsonPrompt(promptName) {
  const filePath = path.join(__dirname, "prompt", `${promptName}.json`);
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading the JSON file:", error);
    return null;
  }
}

// 配置 multer 存储，将上传的文件放入 prompt 文件夹，并以原始文件名保存
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "prompt/"); // 上传文件存储的路径
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // 使用上传文件的原始文件名
  },
});

const upload = multer({ storage: storage });

// Step 3: 配置環境變量
dotenv.config();

// Step 4: 創建 Express 應用實例
const app = express();

// Step 5: 配置中間件
app.use(express.static("public")); // 靜態文件服務
app.use(express.json()); // 解析 JSON 請求體

// 使用 express-session 進行會話管理
app.use(
  expressSession({
    secret: "your_session_secret", // 應該使用隨機字符串
    resave: false,
    saveUninitialized: true,
  })
);

// OpenAI 客戶端實例
const openai = new OpenAI({ apiKey: process.env.APIKEY });

// 會話中用於存儲消息的陣列
let sessionMessages = [];

// Step 6: 路由定義
// 首頁路由
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "verify.html"));
});

// 驗證路由
app.post("/verify", (req, res) => {
  if (req.body.password === process.env.PASSWORD) {
    req.session.authenticated = true;
    res.status(200).send(req.session.authenticated);
  } else {
    res.status(401).send("Incorrect password");
  }
});

// 聊天頁面路由
app.get("/chat", (req, res) => {
  if (req.session.authenticated) {
    res.sendFile(path.join(__dirname, "pages", "chat.html"));
  } else {
    res.redirect("/");
  }
});

// 聊天 API 路由
app.post("/api/chat-completion", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const promptName = req.body.prompt; // 假設 prompt 名稱也從請求體中獲得
    const promptData = readJsonPrompt(promptName);

    // 根据 promptData 初始化 sessionMessages
    if (promptData) {
      sessionMessages[0] = promptData;
    } else {
      // 如果没有找到 promptData，使用默认消息
      sessionMessages = [{ role: "system", content: "都用繁體中文" }];
    }

    sessionMessages.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: sessionMessages,
    });

    const aiMessage = response.choices[0].message.content;
    sessionMessages.push({ role: "assistant", content: aiMessage });
    // 將對話存儲到日誌文件
    const logFilePath = path.join(logDirectory, `log-${getTodayDate()}.txt`);
    fs.writeFileSync(logFilePath, JSON.stringify(sessionMessages, null, 2));
    // 修改這部分：僅發送最新的 AI 回覆
    res.json({ answer: aiMessage });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});

app.post("/api/upload-json", upload.single("jsonFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  // 文件上传成功后，更新前端 select 选项
  // 读取 prompt 文件夹中的所有文件，构建新的选项列表
  fs.readdir("prompt/", (err, files) => {
    if (err) {
      console.error("Could not list the directory.", err);
      res.status(500).send("Server error!");
    }

    // 使用 filter() 确保只有 .json 文件被包括在内
    const options = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const fileNameWithoutExt = path.basename(file, ".json");
        return `<option value="${fileNameWithoutExt}">${fileNameWithoutExt}模式</option>`;
      })
      .join("");

    const defaultOption = '<option value="default">預設繁中回覆</option>';
    const selectHtml = `<select id="chat-settings" class="chat-settings">${defaultOption}${options}</select>`;

    res.send({ selectHtml: selectHtml });
  });
});

// Step 7: 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
