# 골 명령어용 프롬프트

아래 프롬프트를 골 명령어에 붙여 넣어 사용합니다.

```text
/goal
프로젝트: /Users/alan/GitHub/gollajwo-store

목표:
골라줘상점의 판매자 화면(coach.html) 상품 관리 기능을 localStorage가 아니라 Google Sheets + Google Drive + Apps Script 기반으로 완성한다. 초등학생 판매자는 Google Sheet를 직접 보거나 편집하지 않고, coach 화면에서 사진/제목/설명만 관리하게 한다.

전제:
- 새 DB는 도입하지 않는다.
- Google Sheet는 숨겨진 상품 저장소로 쓴다.
- Google Drive는 상품 이미지 저장소로 쓴다.
- 학생 UI에는 product_id, active, image_url, sort_order 같은 내부 필드를 노출하지 않는다.
- 상품은 최대 3개만 판매 페이지(index.html)에 표시한다.

GWS CLI:
- gws 실행 파일은 아래 경로를 우선 사용한다.
  /Users/alan/.nvm/versions/node/v24.11.0/lib/node_modules/@googleworkspace/cli/node_modules/.bin_real/gws
- 먼저 auth 상태를 확인한다.
  gws auth status --format json
- Drive와 Sheets scope가 유효한지 확인한다.
- GWS로 기존 골라줘상점 스프레드시트와 Products 탭 구조를 확인한다.
- 필요하면 Drive에 상품 이미지용 폴더를 만들고 folderId를 기록한다.
- 필요하면 Products 탭 헤더를 보강한다.

구현:
1. coach.js에서 localStorage 상품 저장 로직을 제거한다.
2. coach.html의 상품 관리 UI는 유지하되, 저장 시 Apps Script Web App으로 POST한다.
3. Apps Script Code.gs에 상품 관리 action을 추가한다.
   - action=products: 활성 상품 목록 반환
   - action=manageProducts: coach 화면용 1~3번 상품 자리 반환
   - action=upsertProduct: slot, title, price, description, items, imageData를 받아 Products 탭 업데이트
   - action=removeProduct: 해당 slot 상품 비활성화
4. 이미지 업로드는 coach 화면에서 파일을 data URL/base64로 읽고 Apps Script로 보낸다.
5. Apps Script는 이미지를 Google Drive 상품 이미지 폴더에 저장하고, Products 탭에는 image_file_id와 표시 가능한 image_url을 저장한다.
6. index.html/app.js는 Apps Script의 products 응답만 사용한다.
7. 판매 페이지에는 항상 최대 3개만 표시한다.
8. README와 google-sheets-setup.md에 초등학생 사용 흐름과 운영자/보호자 설정 흐름을 분리해서 문서화한다.

검증:
- GWS로 Products 탭 헤더와 기존 데이터 확인
- coach.html 로그인 확인: seller / gollajwo2026
- 상품 1번에 사진, 제목, 상세 설명 저장
- Products 탭에 값이 들어갔는지 GWS로 확인
- Drive 이미지 폴더에 이미지 파일이 생성됐는지 GWS로 확인
- index.html에서 저장한 상품이 표시되는지 브라우저로 확인
- 상품 4개 이상이 저장되더라도 index.html에는 3개만 보이는지 확인
- localStorage 상품 의존성이 제거됐는지 코드 검색으로 확인

주의:
- Apps Script 배포가 GWS CLI만으로 불가능하면, Code.gs 파일을 완성한 뒤 기존 Apps Script 프로젝트에 반영하는 정확한 수동 배포 절차를 남기고, 배포 후 endpoint 검증까지 수행한다.
- 비밀값이나 OAuth 토큰은 출력하지 않는다.
```
