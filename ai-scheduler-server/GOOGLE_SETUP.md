# Google Calendar 연동 설정 가이드

전체 소요 시간: 약 15분

---

## STEP 1 — Supabase에 settings 테이블 추가

Google OAuth 토큰을 저장하기 위한 테이블이 필요합니다.

1. [supabase.com](https://supabase.com) → 프로젝트 선택
2. 왼쪽 메뉴 **SQL Editor** 클릭
3. 아래 SQL 붙여넣기 후 **Run** 클릭

```sql
create table settings (
  key   text primary key,
  value text
);

alter table settings enable row level security;
create policy "allow all" on settings for all using (true) with check (true);
```

---

## STEP 2 — Google Cloud Console 앱 등록

### 2-1. 프로젝트 생성
1. [console.cloud.google.com](https://console.cloud.google.com) 접속 (Google 계정 로그인)
2. 상단 프로젝트 선택 드롭다운 → **새 프로젝트**
3. 프로젝트 이름: `ai-scheduler` → **만들기**

### 2-2. Google Calendar API 활성화
1. 왼쪽 메뉴 **API 및 서비스 > 라이브러리**
2. 검색창에 `Google Calendar API` 입력
3. **Google Calendar API** 클릭 → **사용 설정**

### 2-3. OAuth 동의 화면 구성
1. 왼쪽 메뉴 **API 및 서비스 > OAuth 동의 화면**
2. User Type: **외부** 선택 → **만들기**
3. 앱 이름: `AI 일정관리`, 사용자 지원 이메일: 본인 이메일 입력
4. 개발자 연락처 이메일: 본인 이메일 입력 → **저장 후 계속**
5. **범위** 단계: **저장 후 계속** (건너뜀)
6. **테스트 사용자** 단계: **+ ADD USERS** → 본인 Google 계정 이메일 추가 → **저장 후 계속**

> ⚠️ 테스트 사용자로 추가하지 않으면 로그인 시 "액세스 차단됨" 오류가 납니다.

### 2-4. OAuth 2.0 클라이언트 ID 생성
1. 왼쪽 메뉴 **API 및 서비스 > 사용자 인증 정보**
2. 상단 **+ 사용자 인증 정보 만들기 > OAuth 클라이언트 ID**
3. 애플리케이션 유형: **웹 애플리케이션**
4. 이름: `ai-scheduler-web`
5. **승인된 리디렉션 URI** → **URI 추가**:
   ```
   https://your-app-name.onrender.com/api/auth/callback
   ```
   > `your-app-name`을 실제 Render.com 앱 이름으로 교체하세요.
6. **만들기** 클릭
7. 팝업에서 **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사 (어딘가에 저장해 두세요)

---

## STEP 3 — Render.com 환경변수 설정

1. [render.com](https://render.com) → 서비스 선택 → **Environment** 탭
2. **Add Environment Variable** 버튼으로 아래 3개 추가:

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | `123456789-abc....apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | `https://your-app-name.onrender.com/api/auth/callback` |

3. **Save Changes** → 자동 재배포 시작 (약 2분 대기)

---

## STEP 4 — GitHub에 코드 업로드

아래 파일들을 GitHub 저장소에 업로드합니다 (모두 `ai-scheduler-server/` 폴더 기준):

| 파일 | 변경 내용 |
|------|----------|
| `requirements.txt` | google-auth 라이브러리 추가 |
| `app.py` | OAuth + Calendar CRUD 엔드포인트 |
| `static/index.html` | Google 로그인 UI + 저장 위치 선택 |

---

## STEP 5 — 앱에서 Google 캘린더 연결

1. Render.com URL 접속
2. 사이드바 **📅 Google 캘린더** 섹션에서 **G Google로 로그인** 클릭
3. 팝업에서 Google 계정 선택 → 권한 허용
4. 팝업이 닫히고 "✅ Google 캘린더가 연결되었습니다" 토스트 표시
5. Google 일정이 초록색 **GC** 뱃지로 캘린더에 표시됨

---

## 기능 정리

| 기능 | 동작 |
|------|------|
| **읽기** | Google 일정 자동 로드 (과거 30일 ~ 미래 90일) |
| **쓰기** | 일정 추가 시 "📅 Google 캘린더" 선택 |
| **수정** | Google 일정 클릭 → 수정 버튼 (Google에 즉시 반영) |
| **삭제** | Google 일정 클릭 → 삭제 버튼 (Google에 즉시 반영) |

---

## 문제 해결

**"액세스 차단됨" 오류 시**
→ Google Cloud Console > OAuth 동의 화면 > 테스트 사용자에 본인 이메일 추가

**"GOOGLE_CLIENT_ID가 설정되지 않았습니다" 오류 시**
→ Render.com Environment 탭에 환경변수가 제대로 저장됐는지 확인 후 재배포

**일정이 로드되지 않을 때**
→ 사이드바 🔄 새로고침 버튼 클릭. 또는 로그아웃 후 재로그인
