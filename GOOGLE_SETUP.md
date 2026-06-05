# Google Calendar 연동 설정 가이드 (Netlify)

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
   https://your-app-name.netlify.app/api/auth/callback
   ```
   > `your-app-name`을 실제 Netlify 앱 이름으로 교체하세요.
6. **만들기** 클릭
7. 팝업에서 **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사 (어딘가에 저장해 두세요)

---

## STEP 3 — Netlify 환경변수 설정

1. [netlify.com](https://netlify.com) → 사이트 선택 → **Site configuration > Environment variables**
2. **Add a variable** 버튼으로 아래 5개 추가:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | `eyJ...` (anon key) |
| `GOOGLE_CLIENT_ID` | `123456789-abc....apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | `https://your-app-name.netlify.app/api/auth/callback` |

3. 저장 후 **Deploys** 탭에서 **Trigger deploy** → **Deploy site** 클릭

---

## STEP 4 — GitHub에 코드 업로드

아래 파일/폴더를 GitHub 저장소에 업로드합니다:

| 파일/폴더 | 설명 |
|-----------|------|
| `netlify.toml` | Netlify 빌드 설정 + 라우팅 규칙 |
| `netlify/functions/api.py` | 서버리스 함수 (모든 API 처리) |
| `netlify/functions/requirements.txt` | Python 패키지 목록 |
| `static/` | 정적 파일 (HTML, SW, 아이콘 등) |

> ℹ️ `app.py`, 루트 `requirements.txt`, `Procfile`은 Netlify에서 사용하지 않습니다.

---

## STEP 5 — Netlify에 사이트 연결 (최초 1회)

Netlify에 처음 배포하는 경우:

1. [netlify.com](https://netlify.com) → **Add new site > Import an existing project**
2. **GitHub** 선택 → 저장소 선택
3. Build settings:
   - **Build command**: (비워두기)
   - **Publish directory**: `static`
4. **Deploy site** 클릭

---

## STEP 6 — 앱에서 Google 캘린더 연결

1. Netlify URL 접속 (예: `https://your-app-name.netlify.app`)
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
→ Netlify > Site configuration > Environment variables에 환경변수가 제대로 저장됐는지 확인 후 재배포

**일정이 로드되지 않을 때**
→ 사이드바 🔄 새로고침 버튼 클릭. 또는 로그아웃 후 재로그인

**함수 실행 오류 확인**
→ Netlify > Functions 탭에서 실시간 로그 확인 가능
