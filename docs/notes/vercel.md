# Sửa deployment Vercel

## Chẩn đoán

Ngày20/11/2026, URL https://gamedemo-xi.vercel.app/ trả HTTP404, X-Vercel-Error=NOT_FOUND. CLI đã xác nhận alias thuộc project gamedemo trong the-s-projects25, repo GitHub đúng bài, branchmain.

Log deployment dpl_7ZcdmJkwkmNuS2kdYEaYv9udwNGj cho thấy nó build commit9818fc1 (repo chỉ có tài liệu, trước mã Phase1/2). Build36ms, không có filecache, statusReady nhưng không có game. Project còn để Output Directory mặc định public hoặc root thay vì dist.

## Thay đổi

- vercel.json chỉ định Other, npmci, npmrunbuild, outputdist và Content-Type JavaScript cho src/*.mjs.
- Build sạch thư mục dist, đưa Three.js sang vendor/three và giữ giấy phép. Tránh URL node_modules, thư mục bị xử lý riêng bởi công cụ hosting.
- Fetch contract bằng import.meta.url, không phụ thuộc URL trang.
- Node24.x khớp môi trường đã kiểm chứng và CI.
- npmrunpreview phục vụ đúng bản dist; npmstart vẫn cho phát triển local, có mappingvendor.
- .vercelignore loại docs/test/cache/localconfig khỏi uploadsource; .gitignore giữ token/env/projectlink ngoài git.
- Thêm tests/deployment.test.mjs: build và phục vụ dist qua HTTP, duyệt toàn bộ importgraph, xác nhậnvendor/JS/CSS/contract tồn tại, không trảHTML thaymodule. Bộ test hiện41 kiểm tra.

## Kiểm chứng và setup agent

- npmtest:41/41 qua, npmrunbuild thành công.
- VercelCLI66.5.0 đã cài global, đăng nhậpnguyendacthe; đã link đúng projectgamedemo.
- Plugin vercel chính thức được cài user-scope qua Codexmarketplace; cần tải lại phiên để nạp command/tool mới. MCP global https://mcp.vercel.com đã thêm và OAuth thành công. Công cụ MCP chưa được nạp trong phiên đang chạy; thao tác project dùng CLI đã xác thực.
- vercelbuild--prod local gặp EPERM do tạo symlink trong cache builder của VercelCLI trên Windows. Không nới quyền hệ thống; dùng buildremote trên Linux của Vercel cho deployment thật.
- Không đổi các tag phase-1/phase-2, không chỉnh bằng chứng phase cũ. Deployment thực tế cần xác nhận Ready + HTTP200 + Chrome khởi động gameplay sau khi phát hành.

Tài liệu chính thức đã đọc: https://vercel.com/get-started.md và https://vercel.com/docs/project-configuration/vercel-json.

## Kết quả production đã xác nhận

- Commit sửa: 4bda767; đã pushmain. Không đổi tag phase.
- Deployment: dpl_ECYh7iffmLWFJvRYC84gAnafJnpz, targetproduction, READY.
- Alias: https://gamedemo-xi.vercel.app/; deployment URL: https://gamedemo-ctn0phxgf-the-s-projects25.vercel.app.
- Build Linux trên2vCPU/8GB: npmci thành công, build hoàn tất trong2s theo log Vercel. Có cảnh báo môi trường cache-dir từ hệ thống build, không chặn build.
- HTTP từ404NOT_FOUND→200OK. Chrome157/1280×720 kiểm tra đủ8URL HTML/JS/vendor/CSS/contract, đúngContent-Type, không lỗiJS; khởi động gameplay, sim_tick tăng, pause/resume thành công.
- Bằng chứng thật: docs/proof/deployment/browser.json và game.png. Tái lập: `node scripts/check-deployment.mjs https://gamedemo-xi.vercel.app`.
- URLproduction công khai, kiểm tra trình duyệt không dùng bypass hay thay đổi DeploymentProtection.
- Scan log1h bị giới hạn retention của Hobby; scan5phút thành công, trả0bản ghi lỗi. Game tĩnh nên không có serverfunction cần giám sát runtime.
