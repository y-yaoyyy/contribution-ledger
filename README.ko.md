# ContributionLedger

> English is the canonical version. This translation may lag behind the latest features.

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | 한국어 | [Español](README.es.md)

압축된 엔지니어링 세션 요약을 검토 가능한 오픈소스 기여 장부로 변환합니다.

ContributionLedger는 의도적으로 작고 결정적으로 설계되었습니다.

- **오프라인.** 네트워크 호출, LLM 호출, 데이터베이스를 사용하지 않습니다.
- **증거 우선.** 각 사례는 session id, block index, topic으로 추적할 수 있습니다.
- **설계상 기록은 과거입니다.** 기록된 단계는 당시 세션에서 나온 말이며, 업스트림 프로젝트의 현재 상태가 아닙니다.
- **개인정보 보호.** 원본 요약 텍스트는 보고서에 복사되지 않습니다. 일반적인 비밀 값은 감지되어 마스킹됩니다.

자동으로 issue를 만드는 도구가 아닙니다. 사람이 재현하고 검증한 뒤 메인테이너와 논의할 수 있는 단서를 제공합니다.

## 왜 필요한가

오래 실행되는 에이전트 세션에는 유용한 디버깅 증거가 있지만, 그 증거는 압축 블록에 흩어져 있습니다. 요약을 그대로 공개 issue에 붙이면 노이즈가 많고 민감한 정보가 유출될 수 있습니다. ContributionLedger는 재현 가능한 형태만 추출합니다.

- 컴포넌트와 증상
- 증상이 나타난 서로 다른 세션
- 기록된 단계(언급됨, 진단됨, 로컬 수정됨, 제출됨, 병합됨)
- 텍스트에서 발견된 GitHub issue/PR 참조
- 이전 결론과 이후 결론 사이의 모순
- 다음 수동 작업

## 요구 사항

- Node.js 22 이상
- 세션 저장소에서 내보낸 JSONL 인벤토리

## 사용법

```bash
node bin/contributionledger.mjs --input sessions.jsonl --out ./contributionledger-out
```

옵션:

```text
-i, --input <file>       읽을 JSONL 인벤토리(필수)
-o, --out <dir>          출력 디렉터리(기본값: ./contributionledger-out)
    --min-sessions <n>   n개 이상의 세션에서 발견된 사례만 유지(기본값: 1)
-h, --help               도움말 표시
-v, --version            버전 표시
```

출력:

```text
contributionledger-out/
  report.md     사람이 읽는 큐와 증거
  cases.json    후속 도구용 구조화된 사례
```

입력 파일은 읽기 전용으로 열리며 도구가 수정하지 않습니다.

## 입력 형식

한 줄에 JSON 객체 하나:

```json
{
  "id": "session-123",
  "title": "CodeArts 이미지 지원",
  "blockDetails": [
    {
      "topic": "이미지 지원",
      "summary": "모델은 텍스트 전용으로 문서화되었지만, 커널은 실제 이미지를 전송했다."
    }
  ]
}
```

`blocks`는 `blockDetails`의 별칭으로 사용할 수 있습니다. 각 블록에는 `topic`과 `summary`가 필요합니다. 자세한 내용은 [docs/input-format.md](docs/input-format.md)를 참고하세요.

## 사례 생성 방식

1. 각 세션과 블록을 읽습니다.
2. `topic + summary`에 보수적인 증상 규칙을 실행합니다.
3. GitHub 참조, 보고 단계, 모순, 개인정보 플래그를 추출합니다.
4. 컴포넌트와 증상으로 그룹화합니다.
5. 서로 다른 세션 수, 로컬 수정, 업스트림 참조, 모순, 발생 횟수로 순위를 매깁니다.
6. 큐와 증거를 출력합니다.

10개의 내장 규칙은 이 프로젝트가 추출된 영역을 다룹니다. CodeArts 이미지 지원, OpenCode 플러그인 수명 주기, MCP 프로세스 수명 주기, 추론 메타데이터, 컨텍스트 압축, DSH 시작, GridDraft AOA 토폴로지, Word 보고서 구조, 자막 커버리지, Magpie provider 메타데이터입니다.

## 보고 단계

| 단계 | 의미 |
|---|---|
| `mentioned` | 증상이 언급되었지만 아직 진단되지 않음 |
| `diagnosed` | 근본 원인이 보고됨 |
| `local-fix-reported` | 로컬 수정이 보고됨 |
| `upstream-submitted` | issue 또는 PR이 보고됨 |
| `duplicate-reported` | 중복으로 닫힘 |
| `merged-reported` | 병합된 것으로 보고됨 |

`merged-reported`는 업스트림 프로젝트가 현재 병합되었다는 뜻이 아닙니다. 행동하기 전에 링크를 다시 확인하세요.

## 개인정보 보호

- 보고서에는 원본 요약 텍스트가 포함되지 않습니다.
- 일반적인 API 키, GitHub 토큰, Slack 토큰, 인증 헤더, 개인 키, base64 이미지 페이로드, password 할당을 감지합니다.
- 감지된 값은 `cases.json`에 유지되는 topic에서 마스킹됩니다. 보고서에는 플래그 이름만 표시됩니다.
- 실제 세션 데이터를 공개 저장소에 커밋하지 마세요. 테스트와 데모에는 합성 fixture를 사용하세요.

완벽한 스캐너는 없습니다. `cases.json`을 공유하기 전에 검토하세요.

## 개발

```bash
npm test
npm run check
node bin/contributionledger.mjs --input tests/fixtures/synthetic.jsonl --out /tmp/contributionledger-demo
```

테스트 스위트는 `node:test`와 Node 표준 라이브러리만 사용합니다.

## 한계

- 규칙은 의도적으로 좁습니다. 놓치는 편이 자신 있는 오탐보다 낫습니다.
- 도구는 전체 채팅 기록이나 도구 로그를 읽지 않습니다. 제공된 압축 인벤토리만 처리합니다.
- 보고된 업스트림 issue가 현재도 열려 있는지 판단할 수 없습니다.
- issue를 만들거나 pull request를 열지 않습니다.

## 라이선스

MIT. [LICENSE](LICENSE)를 참고하세요.