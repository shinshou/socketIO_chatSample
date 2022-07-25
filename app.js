const express = require("express");
const crypto = require("crypto");
const path = require("path");
const app = express();

// ---------------------------------------
// ミドルウェア
// ---------------------------------------
// 静的ファイル配信
app.use(express.static(path.join(__dirname, "/public")));

// ---------------------------------------
// ルーティング
// ---------------------------------------
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/index.html"));
});

app.get("/:file", function (req, res) {
  res.sendFile(path.join(__dirname, "/", req.params.file));
});

// ---------------------------------------
// 変数設定
// ---------------------------------------
const MEMBER = {};
// データ内容
// {
//   "socket.id": { token: "abcd", name: "foo", count: 1 },
//   "socket.id": { token: "efgh", name: "bar", count: 2 },
// }

let MEMBER_COUNT = 1;

// ---------------------------------------
// 関数
// ---------------------------------------
// トークン作成
function makeToken(id) {
  const salt = "SET_USER_SALT";
  const str = salt + id;
  const hashStr = crypto.createHash("sha256").update(str).digest("hex");
  return hashStr;
}

// トークン認証
function authToken(socketid, token) {
  return socketid in MEMBER && token === MEMBER[socketid].token;
}

// メンバー取得
function getMember() {
  const list = [];
  for (let key in MEMBER) {
    const cur = MEMBER[key];
    if (cur.name !== null) {
      list.push({ token: cur.count, name: cur.name });
    }
  }
  return list;
}

// ---------------------------------------
// サーバー・socket.io
// ---------------------------------------
// サーバー起動
const server = app.listen(3000, function () {
  console.log("I am running!");
});

// socket.io
const io = require("socket.io")(server);

// ---------------------------------------
// socket.io処理
// ---------------------------------------
// ユーザー接続処理
io.on("connection", function (socket) {
  console.log("connected");

  // ---------------------------------------
  // トークン返却処理
  // ---------------------------------------
  (() => {
    // socket.idからトークンの作成
    const token = makeToken(socket.id);
    // MEMBERに追加
    MEMBER[socket.id] = { token: token, name: null, count: MEMBER_COUNT };
    // MEMBER_COUNTプラス１
    MEMBER_COUNT++;
    // トークンの返却
    io.to(socket.id).emit("token", { token: token });
  })();

  // ---------------------------------------
  // ユーザー入室処理
  // ---------------------------------------
  socket.on("join", function (data) {
    // ---------------------------------------
    // トークン確認処理
    // `---------------------------------------
    if (authToken(socket.id, data.token)) {
      // 確認OK
      const memberList = getMember();
      io.to(socket.id).emit("join-result", { status: true, list: memberList });

      // メンバー一覧に追加
      MEMBER[socket.id].name = data.name;

      // 入室通知
      io.to(socket.id).emit("member-join", data);
      socket.broadcast.emit("member-join", {
        name: data.name,
        token: MEMBER[socket.id].count,
      });
    } else {
      // 確認NG
      io.to(socket.id).emit("join-result", { status: false });
    }
  });

  // ---------------------------------------
  // ユーザー投稿処理
  // ---------------------------------------
  socket.on("post", function (data) {
    // ---------------------------------------
    // トークン確認処理
    // ---------------------------------------
    if (authToken(socket.id, data.token)) {
      // 確認OK
      // 投稿者へ
      io.to(socket.id).emit("member-post", data);

      // 投稿者以外
      socket.broadcast.emit("member-post", {
        text: data.text,
        token: MEMBER[socket.id].count,
      });
    }
  });

  // ---------------------------------------
  // ユーザー退室処理
  // ---------------------------------------
  socket.on("quit", function (data) {
    // ---------------------------------------
    // トークン確認処理
    // ---------------------------------------
    if (authToken(socket.id, data.token)) {
      // 確認OK
      // 退室者へ
      io.to(socket.id).emit("quit-result", { status: true });

      // 退室者以外
      socket.broadcast.emit("member-quit", { token: MEMBER[socket.id].count });

      // 削除
      delete MEMBER[socket.id];
    } else {
      // 確認NG
      io.to(socket.id).emit("quit-result", { status: false });
    }
  });
});
