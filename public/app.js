// ユーザーオブジェクト
const IAM = {
  token: null,
  name: null,
};

let socket = io();

socket.on("connect", () => {
  // 表示を切り替える
  $("#nowconnecting").style.display = "none"; // 「接続中」を非表示
  $("#chat").style.display = "none"; // チャットを表示
  $("#inputmyname").style.display = "block"; // 名前入力を表示
});

// トークンを発行されたら
socket.on("token", (data) => {
  IAM.token = data.token;
});

$("#frm-myname").addEventListener("submit", (e) => {
  // 規定の送信処理をキャンセル(画面遷移しないなど)
  e.preventDefault();

  // 入力内容を取得する
  const myname = $("#txt-myname");
  if (myname.value === "") {
    return false;
  }

  // 名前をセット
  $("#myname").innerHTML = myname.value;
  IAM.name = myname.value;

  // 表示を切り替える
  $("#inputmyname").style.display = "none"; // 名前入力を非表示
  $("#chat").style.display = "block"; // チャットを表示
});

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
    name: IAM.name,
  });

  // 発言フォームを空にする
  msg.value = "";
});

socket.on("member-post", (msg) => {
  const is_me = msg.token === IAM.token;
  addMessage(msg, is_me);
});

function addMessage(msg, is_me = false) {
  const list = $("#msglist");
  const li = document.createElement("li");

  //------------------------
  // 自分の発言
  //------------------------
  if (is_me) {
    li.innerHTML = `<span class="msg-me"><span class="name">${msg.name}</span>> ${msg.text}</span>`;
  }
  //------------------------
  // 自分以外の発言
  //------------------------
  else {
    li.innerHTML = `<span class="msg-member"><span class="name">${msg.name}</span>> ${msg.text}</span>`;
  }

  // リストの最初に追加
  list.insertBefore(li, list.firstChild);
}
