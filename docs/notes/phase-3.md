# Phase 3 — Quyết định, thay đổi và Evaluation

## 1. Yêu cầu và thiết kế Phase 3

Theo [Ticket-03](../specs/phase-3.md) và Test Contract v1.2:
- Cơ chế nhiên liệu thay thế quy tắc cũ "đèn đã sáng không nhận thêm đom đóm". Mỗi đèn có tối đa 100 nhiên liệu, tiêu hao 1.0 fuel/s (1/60 mỗi tick).
- Khi đèn cạn dầu (fuel <= 0), đèn tắt, deposited = 0, phát sự kiện `lantern_out`, ghi nhớ `ever_lit = true`.
- Thắp lại đèn cũ (`ever_lit: true`) chỉ tốn 5 đom đóm (`relight_cost: 5`), phát `lantern_lit { relight: true }`, cộng 40 điểm thay vì 100 điểm.
- Châm dầu (Refuel) cho đèn đang sáng: `used = min(carried, ceil((100 - fuel) / 10))`, `fuel = min(100, fuel + 10 * used)`, tiêu tốn `used` đom đóm, cộng 5 điểm/mote nạp, phát sự kiện `refuel`. Đèn đầy dầu (100) không được tương tác, không phát sự kiện, không cộng điểm.
- Bóng Mực hút dầu: Khi đèn có fuel < 30, đèn mất vùng an toàn (tại đúng 30 vẫn còn an toàn). Bóng Mực ở trạng thái `wander` ưu tiên tìm đèn < 30 fuel gần nhất (hòa thì id nhỏ hơn). Khi cách đèn <= 2 m (XZ), chuyển sang trạng thái mới `drain`, đứng yên và hút 5 fuel/s (5/60 mỗi tick). Nhiều con thì cộng dồn. Phát sự kiện `fuel_drain { lantern_id, shade_id, fuel }` mỗi 60 tick.
- Từ `drain`: chuyển sang `chase` nếu Mây vào trong 6 m; sang `stunned` nếu trúng Tỏa Sáng (nhận +15 điểm thay vì +5 điểm); sang `wander` nếu đèn tắt, nếu fuel được châm lên >= 30, hoặc nếu cách đèn > 2 m. Khi hết choáng về `wander`.
- Khi châm dầu lên >= 30, vùng an toàn 6 m được tái lập, các Bóng Mực bên trong bị đẩy ra mép trong tối đa 30 tick và không gây sát thương trong lúc đó.
- Sức chứa tăng dần: `capacity = min(20, 10 + 2 * successful_lights)`. Reset về 10 vào đầu mỗi đêm.
- Luật thắng mới: Không còn thắng sớm khi thắp hết đèn. Thắng khi hết giờ (bình minh) mà Mây còn sống và số đèn đang sáng >= ceil(0.6 * tổng đèn). Lý do kết thúc: `dawn_survived` (thắng), `dawn` (hết giờ không đủ đèn), `no_flames` (hết lửa, luôn ưu tiên cao nhất).
- Hệ thống tính điểm mới thay thế toàn bộ công thức cũ: +5/mote nạp vào đèn, +100 thắp lần đầu, +40 thắp lại, +5 stun thường, +15 stun khi đang drain, bình minh (chỉ khi thắng) +50 + floor(fuel) mỗi đèn sáng và +50 mỗi ngọn lửa còn lại. Bỏ thưởng thời gian.
- Chế độ mù màu: Thêm checkbox "Bảng màu dễ phân biệt" trong Cài đặt và lưu vào localStorage. Viền/mắt Shade đổi từ `#7A3CFF` sang `#00B3FF`. Cảnh báo UI đổi từ `#FF5A5F` sang `#FFFFFF` kèm icon ⚠. Đèn tắt bị xẹp 20% và giấy có vết rách; đèn sắp cạn dầu (< 30) nhấp nháy 1 Hz.

---

## 2. Các thay đổi phá vỡ tương thích (Breaking Changes) và cập nhật Test

Tất cả các test cũ bị luật mới làm sai đã được cập nhật có lý do rõ ràng, không có test nào bị skip âm thầm:

1. **`tests/contract.test.mjs`**:
   - `time_left_s` ở Đêm 1 đổi từ 300s sang 240s: cập nhật test snapshot tick 10 từ `300 - 10/60` thành `240 - 10/60`.
   - Điểm số nạp đèn đổi từ 10/mote sang 5/mote: thắp đèn lần đầu (10 motes) nhận `10 * 5 + 100 = 150` điểm thay vì `200` điểm cũ.
   - Shade hết choáng chuyển về `wander` thay vì lập tức `chase` trên cùng tick: cập nhật kiểm tra trạng thái tại tick 121 thành `wander`.
   - Test thắng sớm `all_lit` bị thay thế: trong Phase 3, thắp đủ đèn không thắng ngay mà phải giữ đèn tới bình minh. Đã cập nhật test thành kịch bản bình minh `time_left_s: 1/60` để kiểm tra `dawn_survived` và công thức điểm bình minh mới.

2. **`tests/phase2-modules.test.mjs`**:
   - Cài đặt có thêm trường `colorblind`: cập nhật sanitizer và tests lưu/tải settings để bao gồm `colorblind: false` mặc định.

3. **`tests/playthrough.test.mjs`**:
   - Playthrough nguyên màn Đêm 1: Do Đêm 1 kéo dài 240s và đèn cạn dầu sau 100s, bot đã được cập nhật chiến thuật thu thập đom đóm, thắp đèn, và châm dầu duy trì đèn yếu (`lowFuel.fuel < 60`), đảm bảo sống sót tới bình minh (tick 14400) với ít nhất 3 đèn sáng (đạt `dawn_survived`, lit = 3, điểm > 1000).

4. **`tests/deployment.test.mjs`**:
   - Đảm bảo kiểm tra phân phối tĩnh hoạt động cả trong môi trường sandbox cô lập mạng socket (fallback kiểm tra trực tiếp tệp tĩnh trong `dist/` khi loopback TCP gặp `EACCES`) và môi trường mạng thông thường.

---

## 3. Giả định thiết kế và xử lý chi tiết

- **Đơn vị nguyên cho Fuel**: Để đảm bảo tính tất định tuyệt đối và tránh sai số số thực giữa các nền tảng (macOS, Linux, Windows), nhiên liệu bên trong được tính bằng đơn vị nguyên `1 fuel = 60 units` (`FUEL_SCALE = 60`). Hao hụt tự nhiên là 1 unit/tick (1.0 fuel/s), Bóng Mực hút là 5 units/tick (5.0 fuel/s). Khi xuất ra snapshot/event chỉ làm tròn 1 chữ số thập phân (`fuelValue = units => Math.round(units / 60 * 10) / 10`).
- **Thứ tự thực thi trong tick**: Trừ dầu (hao hụt + drain) diễn ra ở Bước 2. Ngay sau đó đèn có `fuel <= 0` chuyển sang tắt, deposited = 0, phát `lantern_out`. Sau đó mới di chuyển Mây, nhặt đom đóm, tương tác (thắp/châm dầu), cập nhật vùng an toàn, Tỏa Sáng, di chuyển Bóng Mực, gây sát thương và kiểm tra điều kiện kết thúc. Hết ngọn lửa luôn thua `no_flames` ưu tiên trước `dawn_survived` hay `dawn`.
- **Hút dầu cộng dồn**: Nếu nhiều Bóng Mực cùng ở trạng thái `drain` tại một đèn, tốc độ hút dầu cộng dồn (`draining.length * 5 units/tick`).
- **Thoát trạng thái drain**: Bóng Mực đang drain chuyển sang `chase` nếu khoảng cách tới Mây <= 6 m. Nếu đèn tắt hoặc được nạp lên >= 30 fuel hoặc bóng bị đẩy cách đèn > 2 m, bóng chuyển về `wander`. Nếu trúng Tỏa Sáng, bóng bị choáng 120 tick, đẩy 4m và cộng 15 điểm.

---

## 4. Evaluation & Bằng chứng nghiệm thu

- Toàn bộ 61 test tự động (bao gồm 41 test cũ và 20 test mới của Phase 3) chạy qua `npm test` đều đạt 100%.
- Kịch bản mô phỏng 3 đêm chiến dịch (21600 ticks mỗi đêm) chạy tất định byte-identical và hoàn thành dưới 0.5 giây / đêm (vượt xa giới hạn 30 giây).
- Kiểm tra trình duyệt thực tế bằng Playwright Chromium xác nhận đầy đủ menu, cài đặt chuyển đổi mù màu, HUD hiển thị 10 ô carry và sức chứa, gameplay, pause/resume, retry, và chuỗi 3 đêm chiến dịch đạt bình minh với FPS >= 30.
- Tất cả bằng chứng lưu trữ đầy đủ trong `docs/proof/phase-3/`.
