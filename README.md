# AI 일정관리 앱 — 배포 가이드

## 전체 흐름

```
[브라우저] ←→ [Render.com Flask 서버] ←→ [Supabase PostgreSQL DB]
```

서버가 재시작되어도 일정 데이터는 Supabase DB에 안전하게 보관됩니다.

---

## 1단계 — Supabase 데이터베이스 설정 (5분)

### 1-1. 프로젝트 생성
1. [supabase.com](https://supabase.com) → **Start your project** (GitHub 계정으로 로그인 가능)
2. **New project** 클릭
3. Project name: `ai-scheduler`, 비밀번호 설정, 리전: `Northeast Asia (Seoul)` 선택
4. **Create new project** → 약 1분 대기

### 1-2. 테이블 생성
1. 좌측 메뉴 **SQL Editor** 클릭
2. 아래 SQL을 복사해서 붙여넣기 후 **Run** 클릭

```sql
create table events (
  id        text primary key,
  title     text not null,
  date      text not null,
  time      text,
  end_time  text,
  location  text,
  note      text,
  priority  text default 'mid',
  created_at timestamptz default now()
);

-- 누구나 읽기/쓰기 가능하도록 허용 (개인 용도)
alter table events enable row level security;
create policy "allow all" on events for all using (true) with check (true);
```

### 1-3. API 키 확인
1. 좌측 메뉴 **Project Settings** → **API** 클릭
2. 아래 두 값을 복사해 둡니다:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public** 키: `eyJhbGci...` (긴 문자열)

---

## 2단계 — Render.com 환경변수 설정

1. Render.com 대시보드 → 서비스 클릭 → **Environment** 탭
2. **Add Environment Variable** 버튼으로 아래 2개 추가:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `SUPABASE_KEY` | `eyJhbGci...` (anon public 키) |

3. **Save Changes** → 자동으로 재배포 시작

---

## 3단계 — GitHub 코드 업데이트

`app.py`와 `requirements.txt`가 변경되었으므로 GitHub에 다시 올립니다.

1. GitHub 저장소에서 `app.py` 파일 클릭 → 연필(✏️) 아이콘으로 편집
2. 새 내용으로 교체 후 **Commit changes**
3. `requirements.txt`도 동일하게 업데이트
4. Render.com이 자동으로 재배포 (약 1~2분)

---

## 완료 확인

배포 URL 접속 후 일정을 추가하고, 브라우저를 닫았다가 다시 열어도 일정이 유지되면 성공입니다.

Supabase 대시보드의 **Table Editor → events** 에서 저장된 데이터를 직접 확인할 수도 있습니다.

---

## 로컬 테스트 (선택)

```bash
# 환경변수 설정 후 실행
export SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
export SUPABASE_KEY=eyJhbGci...
pip install -r requirements.txt
python app.py
```
