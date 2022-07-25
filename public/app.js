// ユーザーオブジェクト
const IAM = {
  token: null,
  name: null,
  is_join: false,
};

// メンバー一覧オブジェクト
const MEMBER = {
  0: "マスター",
};

// ---------------------------------------
// 関数
// ---------------------------------------
/* 初期化処理 */
function gotoSTEP1() {
  // NowLoadingから開始
  $("#nowconnecting").style.display = "block"; // NowLoadingを表示
  $("#inputmyname").style.display = "none"; // 名前入力を非表示
  $("#chat").style.display = "none"; // チャットを非表示

  // 自分の情報を初期化
  IAM.token = null;
  IAM.name = null;
  IAM.is_join = false;

  // メンバー一覧を初期化
  for (let key in MEMBER) {
    if (key !== "0") {
      delete MEMBER[key];
    }
  }

  // チャット内容を全て消す
  $("#txt-myname").value = ""; // 名前入力欄 STEP2
  $("#myname").innerHTML = ""; // 名前表示欄 STEP3
  $("#msg").value = ""; // 発言入力欄 STEP3
  $("#msglist").innerHTML = ""; // 発言リスト STEP3
  $("#memberlist").innerHTML = ""; // メンバーリスト STEP3

  // Socket.ioサーバへ再接続
  socket.close().open();
}

/* メッセージ処理 */
function addMessage(msg, is_me = false) {
  const list = $("#msglist");
  const li = document.createElement("li");
  const name = MEMBER[msg.token];

  //------------------------
  // 管理人メッセージ
  //------------------------
  if (msg.token === 0) {
    li.innerHTML = `<span class="msg-master"><span class="name">${name}</span> > ${msg.text}</span>`;
  }
  //------------------------
  // 自分の発言
  //------------------------
  else if (is_me) {
    li.innerHTML = `<span class="msg-me"><span class="name">${name}</span> > ${msg.text}</span>`;
  }
  //------------------------
  // その他の発言
  //------------------------
  else {
    li.innerHTML = `<span class="msg-member"><span class="name">${name}</span> > ${msg.text}</span>`;
  }

  // リストの最初に追加
  list.insertBefore(li, list.firstChild);
}

/* 管理人メッセージ */
function addMessageFromMaster(msg) {
  addMessage({ token: 0, text: msg });
}

/* メンバーリスト追加 */
function addMemberList(token, name) {
  const list = $("#memberlist");
  const li = document.createElement("li");
  li.setAttribute("id", `member-${token}`);
  if (token == IAM.token) {
    li.innerHTML = `<span class="member-me">${name}</span>`;
  } else {
    li.innerHTML = name;
  }

  list.appendChild(li);

  MEMBER[token] = name;
}

/* メンバーリスト削除 */
function removeMemberList(token) {
  const id = `#member-${token}`;
  if ($(id) !== null) {
    $(id).parentNode.removeChild($(id));
  }

  delete MEMBER[token];
}

let socket = io();

// ---------------------------------------
// サーバーへ接続
// ---------------------------------------
socket.on("token", function (data) {
  IAM.token = data.token;

  if (!IAM.is_join) {
    $("#nowconnecting").style.display = "none"; // 「接続中」を非表示
    $("#chat").style.display = "none"; // チャットを非表示
    $("#inputmyname").style.display = "block"; // 名前入力を表示
    $("#txt-myname").focus();
  }
});

// ---------------------------------------
// ユーザー入室処理
// ---------------------------------------
$("#frm-myname").addEventListener("submit", (e) => {
  // 規定の送信処理をキャンセル(画面遷移しないなど)
  e.preventDefault();

  // 入力内容を取得する
  const myname = $("#txt-myname");
  if (myname.value === "") {
    alert("名前を入力してください！");
    return false;
  }

  // 名前をセット
  $("#myname").innerHTML = myname.value;
  IAM.name = myname.value;

  // （サーバー）ユーザー入室処理へ
  socket.emit("join", { token: IAM.token, name: IAM.name });

  // ボタンを無効にする
  $("#frm-myname button").setAttribute("disabled", "disabled");
});

// ---------------------------------------
// ユーザー入室処理結果
// ---------------------------------------
socket.on("join-result", function (data) {
  // ---------------------------------------
  // 入室確認処理
  // ---------------------------------------
  if (data.status == true) {
    // 確認OK
    IAM.is_join = true;

    // ログイン中メンバーの表示
    for (let i = 0; i < data.list.length; i++) {
      const currentMember = data.list[i];
      const displayMember = $("#memberlist");
      if (!(currentMember.token in MEMBER)) {
        addMemberList(currentMember.token, currentMember.name);
      }
    }

    $("#chat").style.display = "block"; // チャットを表示
    $("#inputmyname").style.display = "none"; // 名前入力を非表示
    $("#msg").focus();
  } else {
    alert("入室できませんでした。");
  }

  // ボタンを有効にする
  $("#frm-myname button").removeAttribute("disabled");
});

// ---------------------------------------
// ユーザー投稿処理
// ---------------------------------------
$("#frm-post").addEventListener("submit", (e) => {
  // 規定の送信処理をキャンセル(画面遷移しないなど)
  e.preventDefault();

  // 入力内容を取得する
  const msg = $("#msg");
  if (msg.value === "") {
    alert("テキストを入力してください！");
    return false;
  }

  // Socket.ioサーバへ送信
  socket.emit("post", {
    text: msg.value,
    token: IAM.token,
  });

  // 発言フォームを空にする
  msg.value = "";
});

// ---------------------------------------
// ユーザー退出処理
// ---------------------------------------
$("#frm-quit").addEventListener("submit", (e) => {
  // 規定の送信処理をキャンセル(画面遷移しないなど)
  e.preventDefault();

  if (confirm("本当に退出しますか？")) {
    // Socket.ioサーバへ送信
    socket.emit("quit", { token: IAM.token });

    // ボタンを無効にする
    $("#frm-quit button").setAttribute("disabled", "disabled");
  }
});

// ---------------------------------------
// ユーザー退出処理結果
// ---------------------------------------
socket.on("quit-result", function (data) {
  // ---------------------------------------
  // 入室確認処理
  // ---------------------------------------
  if (data.status) {
    // 確認OK
    gotoSTEP1();
  } else {
    // 確認NG
    alert("退室出来ませんでした。");
  }

  // ボタンを有効にする
  $("#frm-quit button").removeAttribute("disabled");
});

// ---------------------------------------
// 他メンバー入室処理
// ---------------------------------------
socket.on("member-join", function (data) {
  if (IAM.is_join) {
    addMessageFromMaster(`${data.name}さんが入室しました。`);
    addMemberList(data.token, data.name);
  }
});

// ---------------------------------------
// 他メンバー退室処理
// ---------------------------------------
socket.on("member-quit", function (data) {
  if (IAM.is_join) {
    const name = MEMBER[data.token];
    addMessageFromMaster(`${name}さんが退室しました。`);
    removeMemberList(data.token);
  }
});

// ---------------------------------------
// 他メンバー発言処理
// ---------------------------------------
socket.on("member-post", (msg) => {
  if (IAM.is_join) {
    const is_me = msg.token === IAM.token;
    addMessage(msg, is_me);
  }
});
