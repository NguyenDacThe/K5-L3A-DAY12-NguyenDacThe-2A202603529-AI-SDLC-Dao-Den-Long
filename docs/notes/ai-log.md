# Nhật ký dùng AI

## Chuẩn bị Phase 1

- Công cụ: Codex.
- Công việc: đọc sáu tài liệu Markdown; kiểm tra file, Git remote và công cụ có sẵn; chuẩn bị hướng dẫn agent, .gitignore và nơi lưu yêu cầu/bằng chứng.
- Trở ngại: công cụ web không truy cập được lab board; đã yêu cầu người dùng cung cấp PRD-0 và Test Contract.
- Quyết định: chưa tự đặt luật game hoặc định dạng headless khi thiếu yêu cầu chính thức.
- Kiểm chứng: kiểm tra phiên bản Node/npm và trạng thái repo; chưa chạy test game vì chưa có mã game.
- Token/chi phí: chưa có số liệu đo đáng tin cậy từ phiên làm việc; cần bổ sung từ thống kê sử dụng thực tế, không ghi số giả.
- Cách tiết kiệm: đọc theo nhóm; chỉ chuẩn bị phần độc lập với yêu cầu, tránh viết rồi sửa lại một contract tự suy đoán.

## Triển khai sau khi nhận yêu cầu

- Nhận PRD-0/Contract từ người dùng; chỉ triển khai Phase 1.
- Codex dùng hướng dẫn Sites cho game web local trong repo; không tạo site hosted. Node built-in test/server/headless, Three.js cho đồ họa, Playwright + Chrome cho kiểm chứng trình duyệt.
- Chạy verify/build, xem ảnh gameplay thật. Có test nguyên màn mặc định tới thắng và so output byte-identical.
- Lỗi phát hiện/sửa: camera làm cảm giác điều khiển ngang ngược; đổi camera và ánh xạ W/S. Lệnh node -e bị mất dấu nháy trong PowerShell; thay bằng file test. npm ban đầu bị hạn chế mạng; tải thành công sau khi công cụ cấp quyền mạng.
- Harness: AGENTS.md có lệnh thật; verify fail-fast; CI tự build/test. Không dùng subagent, chưa có reviewer độc lập.
- Không có thống kê token/chi phí đáng tin cậy từ công cụ; người học cần bổ sung từ giao diện sử dụng thực tế. Không ghi số đo giả.
- Kiểm tra bổ sung: cài bằng lockfile trong thư mục nguồn riêng không có node_modules, build/test qua. Test màn thắng/thua và restart trên Chrome dùng fixture scenario có ghi rõ trong bằng chứng. Lần đầu test nhấn E quá ngắn so với tick của WebGL software nên timeout; sửa test giữ E cho tới khi mô phỏng nhận, không sửa luật game.
