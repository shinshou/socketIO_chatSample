const express = require("express");
const crypto = require("crypto");
const app = express();

app.use(express.static(__dirname + "/public"));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.get("/:file", function (req, res) {
  res.sendFile(__dirname + "/" + req.params.file);
});

const server = app.listen(3000, function () {
  console.log("Iam running!");
});

const io = require("socket.io")(server);

function makeToken(id) {
  const salt = "SET_USER_SALT";
  const str = salt + id;
  const hashStr = crypto.createHash("sha256").update(str).digest("hex");
  return hashStr;
}

io.on("connection", function (socket) {
  console.log("connected");
  // console.log(socket.id);

  (() => {
    // socket.idからトークンの作成。
    const token = makeToken(socket.id);
    io.to(socket.id).emit("token", { token: token });
  })();

  socket.on("post", function (msg) {
    console.log("message:" + msg);
    io.emit("member-post", msg);
  });

  socket.on("disconnect", function () {
    console.log("disconnected");
  });
});
