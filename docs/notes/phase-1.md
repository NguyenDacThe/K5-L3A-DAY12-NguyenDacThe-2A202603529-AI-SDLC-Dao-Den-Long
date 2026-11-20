# Phase 1 — chuẩn bị và kế hoạch

## Trạng thái

Đã nhận PRD-0 và Test Contract từ người dùng, triển khai game web và CLI headless dùng chung mô phỏng. Build và 14 test đã qua, gồm nguyên màn mặc định tới thắng; Chrome smoke đã chạy. Bằng chứng tại docs/proof/phase-1/.

## Thông tin đã xác nhận từ tài liệu repo

- Game 3D góc nhìn thứ ba: Mây gom đom đóm, thắp Đèn Lồng Lớn và né Bóng Mực.
- Tự chọn công nghệ; phải chạy được trên macOS hoặc Linux.
- Phase 1 cần bản chơi được của màn đầu tiên và chế độ headless đúng Test Contract.
- Bằng chứng phải thật và khớp mã tại tag.

## Tài liệu đã bổ sung

- PRD-0 và Test Contract v1.0 được ghi tại docs/specs/phase-1.md.
- Công nghệ: Three.js cho hiển thị, Node >=22 cho server/test/headless; lockfile khóa dependency.
- src/game.mjs thuần, không DOM/GPU/clock; hai chế độ đọc cùng game.contract.json.

## Kế hoạch đã thực hiện

1. Lưu nguyên văn yêu cầu; lập bảng tiêu chí nghiệm thu và ghi giả định cho chỗ mơ hồ.
2. Chọn công nghệ, tạo chương trình thử và ghi lệnh chạy thực tế.
3. Xây logic độc lập với hiển thị; triển khai headless đúng contract.
4. Viết scenario kiểm tra hành vi, tạo màn 3D chơi được.
5. Chạy test và headless; kiểm tra thủ công gameplay; lưu bằng chứng và giới hạn.
6. Cập nhật README, đánh giá Phase 1; commit và tag khi đạt mốc bàn giao.

## Kết quả kiểm tra môi trường

- Windows / PowerShell; Node.js v24.14.0, npm 11.11.1.
- Có Git và Python trên PATH.
- Origin đã trỏ tới repo GitHub đúng tên bài.
- Chưa kiểm chứng trên macOS hoặc Linux.

## Giả định cho phần PRD còn mơ hồ

- Đảo bán kính 32 m, chân bị chặn ở mép, không rơi/phạt rơi, fall_enabled=false. Không dash.
- Nhảy tốc độ đầu 6 m/s, trọng lực 18 m/s². Nhảy không né hit vì khoảng cách dùng XZ.
- 100 đom đóm đầu màn, bổ sung 1 con/3 giây khi dưới 100. Có 4 Bóng Mực đầu màn, thêm 1/10 giây, tối đa 10. Scenario có thể tắt sinh/thay danh sách.
- Đèn trên vòng bán kính 21 m; E nạp đèn chưa sáng gần nhất trong 3 m, chuyển tối đa phần còn thiếu; cho phép nạp nhiều lần.
- Hit mất 1 lửa và floor(carried*0.5) đốm, các đốm mất tan biến; bất tử 120 tick.
- Tỏa sáng tốn 2 cả khi không trúng ai, bán kính 6 m, đẩy 4 m, choáng 180 tick, hồi 60 tick. Trúng lại địch đang choáng làm mới thời gian và được điểm.
- Đèn sáng bảo vệ 5 m; đèn chưa sáng không bảo vệ. Địch được đẩy ra ngoài nếu scenario hoặc đèn mới sáng đặt nó trong vùng bảo vệ.
- Thưởng thời gian chỉ khi thắng, floor số giây còn lại. Scenario không cộng điểm.
- Thứ tự bước: di chuyển/nhảy, nhặt, nạp, tỏa sáng, đuổi/hit, kết thúc, sinh bổ sung. Kết thúc đồng thời ưu tiên hết lửa, đủ đèn, rồi bình minh.
- Web dùng seed 2026; restart reset toàn bộ màn. Pause/focus loss dừng gameplay, không thuộc headless.

## Đánh giá và giới hạn

- 14 test qua; CLI thật và mã lỗi được kiểm tra. Nguyên màn mặc định seed 2026 thắng bằng input sau 2439 tick, không sửa trạng thái giữa màn.
- Chrome smoke thật: mở màn, start, di chuyển/nhảy, camera, pause/resume, resize; thêm scenario fixture kiểm tra màn thắng/thua và nút chơi lại. Đây không phải lượt chơi nguyên màn bằng tay.
- Chưa chạy bộ test ẩn, chưa chạy trực tiếp macOS/Linux, chưa có kết quả CI Ubuntu từ GitHub.
- Chưa có reviewer độc lập hoặc video Phase 4. Không có test cũ bị tắt/bỏ.
- Bài học: dùng chung logic tránh lệch tuning; xem ảnh thật giúp phát hiện hướng camera sai; lệnh thử node -e lỗi quoting PowerShell được thay bằng test .mjs tái lập.
