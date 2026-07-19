<div align="center">

# THE FRAME

개인 사진첩 프로젝트

![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-C72E49?style=for-the-badge&logo=minio&logoColor=white)

[사이트 보러가기 →](https://photos.bluewarn.dev)

</div>

---

## 기능

- 사진 그리드와 상세 보기
- 사진 크게 보기
- EXIF 표시
- 익명 좋아요
- 연도별 아카이브
- 다크 모드
- SEO 지원
- 관리자 페이지
- 비공개 사진

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
