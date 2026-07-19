<div align="center">

# THE FRAME

개인 사진첩 프로젝트

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwindcss&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-S3-C72E49?logo=minio&logoColor=white)

[사이트 보러가기 →](https://photos.bluewarn.dev)

</div>

---

## 기능

- 정사각 그리드 홈, 무한 스크롤
- 사진 클릭 시 몰입 모드 (마우스 따라 이동, 단계별 확대)
- EXIF 자동 표시 — 카메라 · 렌즈 · 셔터 · ISO
- 회원가입 없는 좋아요 (쿠키 기준)
- 연도별 아카이브 · 랜덤 사진
- 다크 모드
- 사이트맵 · 오픈그래프 자동 생성
- 관리자 페이지 (업로드 · 편집 · 삭제)
- 비공개 사진 지원 (링크가 있어도 서버가 차단)

## 시작하기

**로컬**

```bash
cp .env.example .env
make dev-up   # MongoDB + MinIO 컨테이너 기동
make dev      # http://localhost:3031
```

**배포**

```bash
cp .env.prod.example .env.prod
# 값 채우고 Caddyfile 도메인 수정
make prod-up
```
