const WORD_BANK = [
  {
    japanese: "朝ご飯",
    reading: "あさごはん",
    meaning: "아침밥",
    level: "N5",
    example: "毎朝、朝ご飯を食べます。",
    exampleReading: "まいあさ、あさごはんをたべます。",
    translation: "매일 아침 아침밥을 먹어요.",
  },
  {
    japanese: "駅",
    reading: "えき",
    meaning: "역",
    level: "N5",
    example: "駅で友だちに会いました。",
    exampleReading: "えきでともだちにあいました。",
    translation: "역에서 친구를 만났어요.",
  },
  {
    japanese: "切符",
    reading: "きっぷ",
    meaning: "표, 승차권",
    level: "N5",
    example: "切符を二枚ください。",
    exampleReading: "きっぷをにまいください。",
    translation: "표 두 장 주세요.",
  },
  {
    japanese: "勉強",
    reading: "べんきょう",
    meaning: "공부",
    level: "N5",
    example: "図書館で日本語を勉強します。",
    exampleReading: "としょかんでにほんごをべんきょうします。",
    translation: "도서관에서 일본어를 공부해요.",
  },
  {
    japanese: "買い物",
    reading: "かいもの",
    meaning: "쇼핑, 장보기",
    level: "N5",
    example: "週末に買い物へ行きます。",
    exampleReading: "しゅうまつにかいものへいきます。",
    translation: "주말에 쇼핑하러 가요.",
  },
  {
    japanese: "天気",
    reading: "てんき",
    meaning: "날씨",
    level: "N5",
    example: "今日は天気がいいです。",
    exampleReading: "きょうはてんきがいいです。",
    translation: "오늘은 날씨가 좋아요.",
  },
  {
    japanese: "写真",
    reading: "しゃしん",
    meaning: "사진",
    level: "N5",
    example: "旅行でたくさん写真を撮りました。",
    exampleReading: "りょこうでたくさんしゃしんをとりました。",
    translation: "여행에서 사진을 많이 찍었어요.",
  },
  {
    japanese: "約束",
    reading: "やくそく",
    meaning: "약속",
    level: "N4",
    example: "明日、先生と約束があります。",
    exampleReading: "あした、せんせいとやくそくがあります。",
    translation: "내일 선생님과 약속이 있어요.",
  },
  {
    japanese: "必要",
    reading: "ひつよう",
    meaning: "필요함",
    level: "N4",
    example: "パスポートが必要です。",
    exampleReading: "ぱすぽーとがひつようです。",
    translation: "여권이 필요합니다.",
  },
  {
    japanese: "便利",
    reading: "べんり",
    meaning: "편리함",
    level: "N4",
    example: "このアプリはとても便利です。",
    exampleReading: "このあぷりはとてもべんりです。",
    translation: "이 앱은 정말 편리해요.",
  },
  {
    japanese: "準備",
    reading: "じゅんび",
    meaning: "준비",
    level: "N4",
    example: "旅行の準備をしています。",
    exampleReading: "りょこうのじゅんびをしています。",
    translation: "여행 준비를 하고 있어요.",
  },
  {
    japanese: "料理",
    reading: "りょうり",
    meaning: "요리",
    level: "N5",
    example: "母は料理が上手です。",
    exampleReading: "はははりょうりがじょうずです。",
    translation: "어머니는 요리를 잘하세요.",
  },
  {
    japanese: "質問",
    reading: "しつもん",
    meaning: "질문",
    level: "N4",
    example: "質問してもいいですか。",
    exampleReading: "しつもんしてもいいですか。",
    translation: "질문해도 될까요?",
  },
  {
    japanese: "返事",
    reading: "へんじ",
    meaning: "대답, 답장",
    level: "N4",
    example: "メールの返事を書きました。",
    exampleReading: "めーるのへんじをかきました。",
    translation: "메일 답장을 썼어요.",
  },
  {
    japanese: "練習",
    reading: "れんしゅう",
    meaning: "연습",
    level: "N4",
    example: "毎日、発音を練習します。",
    exampleReading: "まいにち、はつおんをれんしゅうします。",
    translation: "매일 발음을 연습해요.",
  },
  {
    japanese: "病院",
    reading: "びょういん",
    meaning: "병원",
    level: "N5",
    example: "午前中に病院へ行きました。",
    exampleReading: "ごぜんちゅうにびょういんへいきました。",
    translation: "오전 중에 병원에 갔어요.",
  },
  {
    japanese: "映画",
    reading: "えいが",
    meaning: "영화",
    level: "N5",
    example: "新しい映画を見たいです。",
    exampleReading: "あたらしいえいがをみたいです。",
    translation: "새 영화를 보고 싶어요.",
  },
  {
    japanese: "季節",
    reading: "きせつ",
    meaning: "계절",
    level: "N4",
    example: "日本には四つの季節があります。",
    exampleReading: "にほんにはよっつのきせつがあります。",
    translation: "일본에는 네 계절이 있어요.",
  },
  {
    japanese: "散歩",
    reading: "さんぽ",
    meaning: "산책",
    level: "N4",
    example: "夕方、公園を散歩します。",
    exampleReading: "ゆうがた、こうえんをさんぽします。",
    translation: "저녁에 공원을 산책해요.",
  },
  {
    japanese: "宿題",
    reading: "しゅくだい",
    meaning: "숙제",
    level: "N5",
    example: "宿題はもう終わりました。",
    exampleReading: "しゅくだいはもうおわりました。",
    translation: "숙제는 벌써 끝났어요.",
  },
  {
    japanese: "会議",
    reading: "かいぎ",
    meaning: "회의",
    level: "N4",
    example: "午後三時から会議があります。",
    exampleReading: "ごごさんじからかいぎがあります。",
    translation: "오후 3시부터 회의가 있어요.",
  },
  {
    japanese: "経験",
    reading: "けいけん",
    meaning: "경험",
    level: "N3",
    example: "この仕事で多くの経験を得ました。",
    exampleReading: "このしごとでおおくのけいけんをえました。",
    translation: "이 일에서 많은 경험을 얻었어요.",
  },
  {
    japanese: "確認",
    reading: "かくにん",
    meaning: "확인",
    level: "N3",
    example: "出発時間を確認してください。",
    exampleReading: "しゅっぱつじかんをかくにんしてください。",
    translation: "출발 시간을 확인해 주세요.",
  },
  {
    japanese: "連絡",
    reading: "れんらく",
    meaning: "연락",
    level: "N4",
    example: "あとで連絡します。",
    exampleReading: "あとでれんらくします。",
    translation: "나중에 연락할게요.",
  },
  {
    japanese: "習慣",
    reading: "しゅうかん",
    meaning: "습관",
    level: "N3",
    example: "早く寝る習慣を作りたいです。",
    exampleReading: "はやくねるしゅうかんをつくりたいです。",
    translation: "일찍 자는 습관을 만들고 싶어요.",
  },
  {
    japanese: "景色",
    reading: "けしき",
    meaning: "경치",
    level: "N4",
    example: "山の上から見る景色はきれいです。",
    exampleReading: "やまのうえからみるけしきはきれいです。",
    translation: "산 위에서 보는 경치는 아름다워요.",
  },
  {
    japanese: "安全",
    reading: "あんぜん",
    meaning: "안전함",
    level: "N4",
    example: "安全に気をつけてください。",
    exampleReading: "あんぜんにきをつけてください。",
    translation: "안전에 주의해 주세요.",
  },
  {
    japanese: "説明",
    reading: "せつめい",
    meaning: "설명",
    level: "N4",
    example: "もう一度説明してください。",
    exampleReading: "もういちどせつめいしてください。",
    translation: "한 번 더 설명해 주세요.",
  },
  {
    japanese: "予定",
    reading: "よてい",
    meaning: "예정",
    level: "N4",
    example: "今週の予定を教えてください。",
    exampleReading: "こんしゅうのよていをおしえてください。",
    translation: "이번 주 예정을 알려 주세요.",
  },
  {
    japanese: "大切",
    reading: "たいせつ",
    meaning: "소중함, 중요함",
    level: "N4",
    example: "友だちはとても大切です。",
    exampleReading: "ともだちはとてもたいせつです。",
    translation: "친구는 정말 소중해요.",
  },
];

const elements = {
  monthLabel: document.querySelector("#monthLabel"),
  dayLabel: document.querySelector("#dayLabel"),
  progressText: document.querySelector("#progressText"),
  progressFill: document.querySelector("#progressFill"),
  speakAllButton: document.querySelector("#speakAllButton"),
  shuffleButton: document.querySelector("#shuffleButton"),
  resetButton: document.querySelector("#resetButton"),
  wordGrid: document.querySelector("#wordGrid"),
  focusLevel: document.querySelector("#focusLevel"),
  focusJapanese: document.querySelector("#focusJapanese"),
  focusReading: document.querySelector("#focusReading"),
  focusMeaning: document.querySelector("#focusMeaning"),
  focusSpeakButton: document.querySelector("#focusSpeakButton"),
  exampleJapanese: document.querySelector("#exampleJapanese"),
  exampleReading: document.querySelector("#exampleReading"),
  exampleKorean: document.querySelector("#exampleKorean"),
  exampleSpeakButton: document.querySelector("#exampleSpeakButton"),
  quizPrompt: document.querySelector("#quizPrompt"),
  choiceGrid: document.querySelector("#choiceGrid"),
  feedback: document.querySelector("#feedback"),
  voiceSelect: document.querySelector("#voiceSelect"),
  supportNote: document.querySelector("#supportNote"),
  template: document.querySelector("#wordTemplate"),
};

const state = {
  todayWords: [],
  selectedIndex: 0,
  completed: new Set(),
  voices: [],
  dayOffset: 0,
};

function getDateKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function seededIndex(seedText, modulo) {
  let hash = 0;
  for (let index = 0; index < seedText.length; index += 1) {
    hash = (hash * 31 + seedText.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

function getDailyWords() {
  const available = [...WORD_BANK];
  const selected = [];
  const dateKey = getDateKey(state.dayOffset);
  let cursor = seededIndex(dateKey, available.length);

  while (selected.length < 10 && available.length) {
    cursor = (cursor * 7 + selected.length * 11 + 3) % available.length;
    selected.push(available.splice(cursor, 1)[0]);
  }

  return selected;
}

function storageKey() {
  return `mainichi-words:${getDateKey(state.dayOffset)}`;
}

function loadCompleted() {
  const saved = JSON.parse(localStorage.getItem(storageKey()) || "[]");
  state.completed = new Set(saved);
}

function saveCompleted() {
  localStorage.setItem(storageKey(), JSON.stringify([...state.completed]));
}

function updateDate() {
  const date = new Date(getDateKey(state.dayOffset));
  elements.monthLabel.textContent = date.toLocaleDateString("ko-KR", { month: "long" });
  elements.dayLabel.textContent = date.toLocaleDateString("ko-KR", { day: "numeric" });
}

function renderWords() {
  elements.wordGrid.innerHTML = "";

  state.todayWords.forEach((word, index) => {
    const clone = elements.template.content.cloneNode(true);
    const card = clone.querySelector(".word-card");
    const mainButton = clone.querySelector(".word-main");
    const speakButton = clone.querySelector(".speak-word");
    const doneInput = clone.querySelector(".done-input");

    card.dataset.index = String(index);
    card.classList.toggle("selected", index === state.selectedIndex);
    clone.querySelector(".word-number").textContent = String(index + 1).padStart(2, "0");
    clone.querySelector(".word-japanese").textContent = word.japanese;
    clone.querySelector(".word-reading").textContent = word.reading;
    clone.querySelector(".word-meaning").textContent = word.meaning;
    doneInput.checked = state.completed.has(index);

    mainButton.addEventListener("click", () => selectWord(index));
    speakButton.addEventListener("click", () => speak(word.japanese));
    doneInput.addEventListener("change", () => {
      if (doneInput.checked) {
        state.completed.add(index);
      } else {
        state.completed.delete(index);
      }
      saveCompleted();
      updateProgress();
    });

    elements.wordGrid.appendChild(clone);
  });
}

function selectWord(index) {
  state.selectedIndex = index;
  const word = state.todayWords[index];

  elements.focusLevel.textContent = word.level;
  elements.focusJapanese.textContent = word.japanese;
  elements.focusReading.textContent = word.reading;
  elements.focusMeaning.textContent = word.meaning;
  elements.exampleJapanese.textContent = word.example;
  elements.exampleReading.textContent = word.exampleReading;
  elements.exampleKorean.textContent = word.translation;

  document.querySelectorAll(".word-card").forEach((card) => {
    card.classList.toggle("selected", Number(card.dataset.index) === index);
  });

  buildQuiz();
}

function updateProgress() {
  const count = state.completed.size;
  elements.progressText.textContent = `${count} / 10 완료`;
  elements.progressFill.style.width = `${count * 10}%`;
}

function buildQuiz() {
  const answer = state.todayWords[state.selectedIndex];
  const choices = [answer.meaning];
  let cursor = seededIndex(`${answer.japanese}${getDateKey(state.dayOffset)}`, WORD_BANK.length);

  while (choices.length < 4) {
    const candidate = WORD_BANK[cursor % WORD_BANK.length].meaning;
    if (!choices.includes(candidate)) choices.push(candidate);
    cursor += 5;
  }

  choices.sort((a, b) => seededIndex(a, 100) - seededIndex(b, 100));
  elements.quizPrompt.textContent = `"${answer.japanese}"의 뜻은?`;
  elements.choiceGrid.innerHTML = "";
  elements.feedback.textContent = "";

  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => {
      const isCorrect = choice === answer.meaning;
      elements.feedback.textContent = isCorrect ? "정답입니다. 발음까지 한 번 더 들어볼까요?" : `아쉬워요. 정답은 "${answer.meaning}"입니다.`;
      elements.feedback.className = `feedback ${isCorrect ? "correct" : "wrong"}`;
      if (isCorrect) speak(answer.japanese);
    });
    elements.choiceGrid.appendChild(button);
  });
}

function loadVoices() {
  state.voices = window.speechSynthesis?.getVoices() || [];
  const japaneseVoices = state.voices.filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
  elements.voiceSelect.innerHTML = "";

  if (!("speechSynthesis" in window)) {
    elements.supportNote.textContent = "이 브라우저는 음성 합성을 지원하지 않습니다.";
    elements.voiceSelect.disabled = true;
    return;
  }

  const voices = japaneseVoices.length ? japaneseVoices : state.voices;
  voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (index === 0) option.selected = true;
    elements.voiceSelect.appendChild(option);
  });

  if (!voices.length) {
    const option = document.createElement("option");
    option.textContent = "기본 음성";
    elements.voiceSelect.appendChild(option);
  }
}

function getSelectedVoice() {
  return state.voices.find((voice) => voice.name === elements.voiceSelect.value);
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.86;
  utterance.pitch = 1;
  const voice = getSelectedVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

async function speakAll() {
  for (const word of state.todayWords) {
    speak(`${word.japanese}。${word.example}`);
    await new Promise((resolve) => {
      const wait = Math.max(1900, (word.japanese.length + word.example.length) * 170);
      window.setTimeout(resolve, wait);
    });
  }
}

function resetCompleted() {
  state.completed.clear();
  saveCompleted();
  renderWords();
  updateProgress();
}

function shuffleDay() {
  state.dayOffset += 1;
  boot();
}

function boot() {
  updateDate();
  state.todayWords = getDailyWords();
  state.selectedIndex = 0;
  loadCompleted();
  renderWords();
  selectWord(0);
  updateProgress();
}

elements.focusSpeakButton.addEventListener("click", () => speak(state.todayWords[state.selectedIndex].japanese));
elements.exampleSpeakButton.addEventListener("click", () => speak(state.todayWords[state.selectedIndex].example));
elements.speakAllButton.addEventListener("click", speakAll);
elements.shuffleButton.addEventListener("click", shuffleDay);
elements.resetButton.addEventListener("click", resetCompleted);

if ("speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
}

loadVoices();
boot();
