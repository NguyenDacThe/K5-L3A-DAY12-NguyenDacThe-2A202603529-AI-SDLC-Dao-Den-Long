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

## Phase 2

- Công cụ: Codex, Node test runner, Three.js, Playwright/Chrome. Không thêm dependency mới, không dùng subagent.
- Đọc file Ticket02 do người dùng dán; hỏi bổ sung bảng chuẩn/palette bị thiếu, triển khai module độc lập trong lúc chờ. Sau khi nhận bảng mới tích hợp v1.1.
- Yêu cầu → AC tại docs/specs/phase-2.md → modules → test/scenario → browser + benchmark/determinism. Chỉ làm Phase2, giữ nguyên tagphase-1.
- AI/lỗi phát hiện: botPhase1 thua vì không dash/tránhđịch; sửa bot, không nới luậtgame. Testsafe cũ đòi >r trongkhi chuẩn cho đứng mép; cập nhật expectation kèm lýdo. Ràdrifter-drop thấy dùngnhầm vànhhit; sửa trả đồ tại chỗ. Ràrecoil cho đủ60bước; giữ tickbirth/drop đúngthứtự.
- Harness: cập nhật AGENTS với v1.1, pulse3D, pause/tick và bằngchứngtáchphase; verify fail-fast tự scenario+hash+benchmark; CI chạy lại toàn bộ.
- Token/chi phí: công cụ không cung cấp số đo đángtin cậy; chưa điền số ước tính tùy tiện. Cần người học bổ sung từ thống kê tài khoản. Tiết kiệm bằng dùng lại dependency, sharedsimulation và module tests trước browser.
