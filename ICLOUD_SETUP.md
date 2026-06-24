# iCloud Calendar 선택 연동 설정

iCloud 연동은 서버 환경변수가 모두 설정된 경우에만 활성화됩니다. 설정하지
않으면 기존 Supabase/Google Calendar 기능만 사용합니다.

## 1. iPhone 일정 저장 위치 확인

이 연동은 iCloud에 저장된 캘린더만 불러옵니다.

1. iPhone에서 **설정 → Apple 계정 → iCloud → 캘린더**를 켭니다.
2. 캘린더 앱에서 연동할 일정이 `iCloud` 아래 캘린더에 들어 있는지 확인합니다.
3. `나의 iPhone`에만 있는 일정은 iCloud 캘린더로 이동합니다.

## 2. Apple 앱 전용 암호 생성

1. [account.apple.com](https://account.apple.com/)에 로그인합니다.
2. **로그인 및 보안 → 앱 전용 암호**를 선택합니다.
3. `AI Scheduler` 같은 이름으로 새 암호를 생성합니다.
4. 생성된 암호를 복사합니다. 기본 Apple 계정 암호를 사용하지 마세요.

## 3. 배포 환경변수 설정

Netlify에서는 **Site configuration → Environment variables**, Render에서는
서비스의 **Environment** 메뉴에 다음 값을 추가합니다.

| Key | Value |
|---|---|
| `ICLOUD_EMAIL` | Apple 계정 이메일 |
| `ICLOUD_APP_PASSWORD` | 생성한 앱 전용 암호 |
| `ICLOUD_CALENDAR_NAME` | 선택 사항. 연동할 캘린더의 정확한 이름 |
| `ICLOUD_CALDAV_URL` | 선택 사항. 기본값 `https://caldav.icloud.com/` |
| `ICLOUD_PROXY_TOKEN` | 필수. GitHub Pages에서 iCloud API를 보호할 임의의 긴 토큰 |

`ICLOUD_CALENDAR_NAME`을 비워 두면 서버에서 조회되는 첫 번째 캘린더를
사용합니다. 여러 캘린더가 있다면 이름을 지정하는 것을 권장합니다.

환경변수를 저장한 후 사이트를 다시 배포합니다.

`ICLOUD_PROXY_TOKEN`은 비밀번호 관리자 등으로 생성한 32자 이상의 임의 문자열을
권장합니다. 이 값은 GitHub 저장소에 커밋하지 말고 Netlify 환경변수에만
저장하세요. 웹앱의 iCloud 섹션에 같은 토큰을 입력하면 해당 브라우저의
`localStorage`에 저장됩니다.

## 4. 동작 확인

1. 웹앱 사이드바의 **iCloud 캘린더**가 `연결됨`으로 표시되는지 확인합니다.
2. iCloud 일정이 `iC` 배지와 함께 나타나는지 확인합니다.
3. 새 일정을 만들 때 **저장 위치 → iCloud 캘린더**를 선택합니다.
4. 생성한 일정이 iPhone 캘린더 앱에도 나타나는지 확인합니다.

지원 범위는 일정 읽기, 생성, 수정, 삭제이며 조회 범위는 과거 30일부터 미래
90일까지입니다.

## 문제 해결

- 연결 실패 시 Apple 계정 이메일과 앱 전용 암호를 다시 확인합니다.
- Apple 계정 암호를 변경하면 기존 앱 전용 암호가 취소될 수 있습니다.
- 지정한 캘린더 이름은 iCloud에 표시되는 이름과 대소문자까지 같아야 합니다.
- 반복 일정은 CalDAV 서버가 확장한 인스턴스로 표시될 수 있습니다.

