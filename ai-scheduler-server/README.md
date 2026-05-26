# AI 일정관리 앱 — 배포 가이드

## 📁 파일 구조

```
ai-scheduler-server/
├── app.py            ← Flask 서버
├── requirements.txt  ← 의존성 패키지
├── render.yaml       ← Render.com 배포 설정
├── events.json       ← 일정 데이터 (자동 생성)
└── static/
    └── index.html    ← 프론트엔드 앱
```

---

## 🚀 방법 1: Render.com 무료 배포 (인터넷 어디서나 접속)

### 1단계 — GitHub에 코드 올리기
1. [github.com](https://github.com) 회원가입 후 로그인
2. 우측 상단 **+** → **New repository** 클릭
3. Repository name: `ai-scheduler` 입력 후 **Create repository**
4. 이 폴더의 모든 파일을 GitHub에 업로드 (드래그 앤 드롭)

### 2단계 — Render.com에 배포
1. [render.com](https://render.com) 회원가입 (GitHub 계정으로 로그인 가능)
2. **New +** → **Web Service** 클릭
3. GitHub 저장소 연결 후 `ai-scheduler` 선택
4. 설정 확인:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. **Create Web Service** 클릭
6. 배포 완료 후 `https://ai-scheduler-xxxx.onrender.com` 형태의 URL 제공

> ⚠️ **주의**: Render.com 무료 플랜은 15분 비활동 후 슬립 모드 진입. 처음 접속 시 30초 정도 로딩될 수 있습니다.

---

## 💻 방법 2: 로컬 PC에서 실행 (같은 네트워크 접속)

### Python이 설치된 경우
```bash
# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# 서버 실행
python app.py
```

브라우저에서 `http://localhost:5000` 접속

**같은 와이파이의 다른 기기에서 접속:**
1. 이 PC의 IP 확인: Windows → `ipconfig` / Mac → `ifconfig`
2. 다른 기기에서 `http://192.168.x.x:5000` 접속

---

## 📱 모바일 접속

배포 후 스마트폰 브라우저에서 Render.com URL 접속하면 모바일 최적화 UI로 동작합니다.

---

## 🔒 데이터 보안 참고

- 현재 버전은 인증 없이 누구나 접속 가능합니다
- 개인 용도로만 사용하거나, Render.com의 환경변수로 비밀번호 보호를 추가하세요
- 데이터는 서버의 `events.json` 파일에 저장됩니다
