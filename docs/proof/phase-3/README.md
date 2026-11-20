# Bằng chứng kiểm thử Phase 3 — Đèn cạn dầu (Contract v1.2)

Thư mục này chứa toàn bộ bằng chứng thực nghiệm và kết quả kiểm thử tự động cho Phase 3 theo yêu cầu DoD của Ticket-03.

---

## 1. Kết quả kiểm thử tự động (`tests.txt`)

Chạy `npm test` thực hiện toàn bộ 61 test case trên Node.js v24.14.0 (Windows):
- 13 test hợp đồng cốt lõi (`contract.test.mjs`)
- 1 test phân phối tĩnh và đóng gói web (`deployment.test.mjs`)
- 10 test module cơ chế 3 đêm Phase 2 (`phase2-modules.test.mjs`)
- 16 test kịch bản tất định Phase 2 (`phase2.test.mjs`)
- 10 test module cơ chế nhiên liệu và luật thắng Phase 3 (`phase3-modules.test.mjs`)
- 10 test kịch bản tất định Phase 3 (`phase3.test.mjs`)
- 1 test bot tự chơi thắng nguyên màn Đêm 1 (`playthrough.test.mjs`)

**Kết quả: 61/61 PASS (100%), thời gian ~600ms.**

---

## 2. Kiểm chứng tất định và Benchmark Headless (`verification.json`)

Chạy `npm run verify` thực hiện mô phỏng chiến dịch 3 đêm đầy đủ với 21,600 ticks mỗi đêm:
- **Đêm 1**: 220.7 ms (14,400 ticks thực thi tới bình minh), byte-identical `true`, SHA256 xác thực.
- **Đêm 2**: 217.2 ms (16,200 ticks thực thi tới bình minh), byte-identical `true`, SHA256 xác thực.
- **Đêm 3**: 443.4 ms (18,000 ticks thực thi tới bình minh), byte-identical `true`, SHA256 xác thực.

Tất cả đều hoàn thành dưới **0.5 giây / đêm**, vượt xa ngưỡng tối đa 30 giây của hợp đồng.

---

## 3. Bot tự chơi sống sót qua bình minh Đêm 1 (`playthrough.json`)

Mô phỏng bot điều khiển với seed 2026 trong `tests/playthrough.test.mjs`:
- Thu thập 74 đom đóm
- Thắp sáng 3 ngọn đèn (L4, L3, L1)
- Châm dầu 10 lần để bảo vệ các đèn không bị cạn dầu
- Đạt bình minh tại tick 14,400 với 3/5 đèn sáng (đáp ứng `win_ratio >= 0.6`)
- Trạng thái kết thúc: `won`, lý do: `dawn_survived`
- Điểm số: 1,110 điểm, còn nguyên 3 Ngọn Lửa.

---

## 4. Kiểm chứng giao diện và hiệu năng trình duyệt (`browser.json`)

Được thực thi bằng Playwright Chromium trong `scripts/browser-phase3.mjs`:
- **Cài đặt & Mù màu**: Lưu và phục hồi âm lượng, độ nhạy chuột và tùy chọn "Bảng màu dễ phân biệt" sau khi reload trang.
- **HUD hiển thị**: 10 ô carry đom đóm ban đầu và nhãn sức chứa động `đang mang / sức chứa`.
- **Tạm dừng**: Phím Esc/P dừng đóng băng sim_tick và mọi chuyển động của thực thể; tiếp tục chơi bình thường sau khi đổi cài đặt.
- **Tiến trình 3 đêm**: Vượt qua Đêm 1 -> Đêm 2 -> Đêm 3 -> Màn hình Bình Minh (Dawn) với tổng điểm hiển thị chính xác.
- **Hiệu năng FPS**: Đạt **144.29 FPS** tại độ phân giải 1280x720 (vượt xa yêu cầu 30 FPS).
- Ảnh chụp màn hình:
  - `menu.png`: Màn hình chính
  - `night1.png`: Gameplay đêm 1 với HUD sức chứa mới
  - `night1-won-fixture.png`, `night2-won-fixture.png`, `night3-won-fixture.png`: Kết quả thắng qua từng đêm
  - `lost-fixture.png`: Màn hình thua và nút chơi lại
