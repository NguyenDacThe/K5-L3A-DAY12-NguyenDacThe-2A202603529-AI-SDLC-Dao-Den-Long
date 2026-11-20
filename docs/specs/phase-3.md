# Ticket-03 — Đèn cạn dầu / Contract v1.2

Nguồn: [nội dung Ticket-03](phase-3-ticket.txt). Tài liệu này quy định các tiêu chí nghiệm thu và ràng buộc kỹ thuật của Phase 3.

## 1. Mục tiêu và thay đổi cốt lõi

Playtest thực tế cho thấy người chơi giỏi có thể thắp toàn bộ đèn chỉ trong 2 phút rồi game kết thúc ngay, làm mất đi sự căng thẳng ở nửa sau của Đêm.
Phase 3 chuyển đổi cơ chế cốt lõi:
- Đèn đã thắp có nhiên liệu (fuel) và hao mòn theo thời gian.
- Bóng Mực (Shades) có thể tìm đến đèn sắp cạn dầu (< 30 fuel) để hút dầu (drain).
- Không còn thắng sớm khi thắp hết đèn: mục tiêu chuyển thành **"Giữ đảo sáng tới bình minh"** (tối thiểu 60% số đèn sáng tại thời điểm hết giờ).

---

## 2. Số liệu chuẩn Contract v1.2

| Nhóm | Thông số | Giá trị chuẩn |
|---|---|---|
| **Nhiên liệu đèn** | `fuel_max` | 100 đơn vị (tính bằng số nguyên: 60 units/đơn vị fuel để không sai số số thực) |
| | `fuel_decay_per_s` | 1.0 đơn vị/giây (1/60 mỗi tick khi đang sáng) |
| | `fuel_per_mote` | 10 đơn vị fuel / mỗi đom đóm nạp thêm |
| | `low_fuel_threshold` | 30 đơn vị (dưới 30 mất an toàn; đúng 30 vẫn an toàn) |
| | Thắp lần đầu | Cần 10 đom đóm (`lantern_cost = 10`), fuel khởi tạo = 100 |
| | Thắp lại (`relight_cost`) | Đèn đã từng sáng (`ever_lit: true`) chỉ cần 5 đom đóm, fuel khởi tạo = 100 |
| | Châm dầu (Refuel) | `used = min(carried, ceil((100 - fuel) / 10))`; `fuel = min(100, fuel + 10 * used)`; trừ `used` đom đóm. Đèn đầy dầu không tương tác, không phát sự kiện, không cộng điểm |
| | Hết dầu (`fuel <= 0`) | `lit = false`, `deposited = 0`, phát sự kiện `lantern_out { lantern_id }`, `ever_lit = true` |
| **Bóng Mực hút dầu** | `drain_per_s` | 5 đơn vị/giây (5/60 mỗi tick khi ở trạng thái `drain`). Cộng dồn theo số con |
| | Tìm đèn yếu | Chỉ Bóng Mực ở trạng thái `wander` mới ưu tiên tìm đèn sáng có `fuel < 30` gần nhất (hòa thì id nhỏ hơn); không có thì về đèn tắt gần nhất |
| | Vào `drain` | Khi cách đèn yếu <= 2 m (XZ), chuyển sang `drain`, đứng yên hút dầu; phát sự kiện `fuel_drain { lantern_id, shade_id, fuel }` mỗi 60 tick |
| | Thoát `drain` | Sang `chase` nếu Mây vào trong 6 m; sang `stunned` nếu trúng Tỏa Sáng (+15 điểm); sang `wander` nếu đèn tắt, fuel >= 30 hoặc cách đèn > 2 m. Hết choáng về `wander` |
| | Hồi phục an toàn | Khi đèn được châm dầu lên >= 30, các con trong vùng 6 m bị đẩy ra mép trong tối đa 30 tick và không gây sát thương lúc đó |
| **Sức chứa tăng dần** | `capacity` | `min(capacity_max, 10 + 2 * successful_lights)` (tối đa 20). `successful_lights` đếm số lần thắp/thắp lại thành công trong đêm, reset về 0 đầu mỗi đêm |
| **Thời lượng & Thắng/thua** | Thời lượng Đêm 1 / 2 / 3 | 240 / 270 / 300 giây |
| | `win_ratio` | 0.6. Thắng khi hết giờ mà số đèn sáng >= ceil(0.6 * tổng đèn): Đêm 1: 3/5, Đêm 2: 4/6, Đêm 3: 5/7 |
| | Không thắng sớm | Thắp đủ đèn vẫn tiếp tục chơi tới bình minh |
| | Thua | Hết Ngọn Lửa (`no_flames`) hoặc hết giờ mà không đủ đèn sáng (`dawn`) |
| | Thắng | Hết giờ mà Mây còn sống và đủ đèn (`dawn_survived`) |
| **Điểm số mới** | Nạp đom đóm | +5 mỗi đom đóm (thắp mới, thắp lại hoặc châm dầu) |
| | Thắp lần đầu | +100 |
| | Thắp lại | +40 |
| | Tỏa Sáng trúng Shade | +5 mỗi con; tổng +15 nếu trước đó đang `drain` |
| | Bình minh (chỉ khi thắng) | Mỗi đèn sáng: +50 + floor(fuel); mỗi Ngọn Lửa còn lại: +50; bỏ thưởng thời gian |
| **Mù màu (Colorblind)** | Cài đặt | Lưu lựa chọn "Bảng màu dễ phân biệt" (`colorblind: true/false`) |
| | Đổi màu | Viền/mắt Shade: `#00B3FF`; cảnh báo UI: `#FFFFFF` kèm icon ⚠ |
| | Hình thể đèn | Đèn tắt xẹp 20% (scale.y = 0.96) và giấy có vết rách; đèn < 30 fuel nhấp nháy 1 Hz |

---

## 3. Tiêu chí nghiệm thu (Acceptance Criteria)

| STT | Hạng mục | Tiêu chí kiểm chứng | Phương pháp kiểm chứng |
|---|---|---|---|
| AC-1 | Hao hụt nhiên liệu | Đèn sáng tự giảm 1.0 fuel/giây (1/60 per tick). Sau 60 tick từ 100 còn 99.0 | Test `fuel-decay` trong `tests/phase3.test.mjs` |
| AC-2 | Đèn tắt khi hết dầu | Khi fuel <= 0, đèn tắt (`lit: false`), `deposited = 0`, nhớ `ever_lit = true`, phát sự kiện `lantern_out` | Test `lantern-out` trong `tests/phase3.test.mjs` |
| AC-3 | Thắp lại giá rẻ | Đèn `ever_lit: true` chỉ tốn 5 đom đóm, phát `lantern_lit { relight: true }`, cộng 40 điểm thắp lại | Test `relight-cost` trong `tests/phase3.test.mjs` |
| AC-4 | Châm dầu chuẩn xác | `used = min(carried, ceil((100 - fuel) / 10))`, tăng fuel tương ứng, trừ đom đóm, cộng điểm +5/mote, phát `refuel`. Đèn đầy dầu (100) không nhận | Test `refuel-clamp` trong `tests/phase3.test.mjs` |
| AC-5 | Tăng sức chứa | Mỗi lần thắp thành công (mới hoặc lại) tăng capacity thêm 2 (tối đa 20). HUD hiển thị `đang mang / sức chứa` | Test `capacity-grow` và kiểm tra HUD browser |
| AC-6 | Bóng Mực hút dầu | Shade wander tìm đèn < 30 fuel; cách <= 2 m vào `drain`, đứng yên hút 5 fuel/s; phát `fuel_drain` mỗi 60 tick | Test `shade-drain` trong `tests/phase3.test.mjs` |
| AC-7 | Tỏa sáng diệt drain | Shade đang drain bị dính Tỏa Sáng nhận 15 điểm (thay vì 5) và chuyển sang `stunned` | Test `drain-pulse` trong `tests/phase3.test.mjs` |
| AC-8 | Đẩy an toàn khi hồi phục | Châm dầu lên >= 30 phục hồi vùng an toàn, đẩy shade ra mép 6 m trong 30 tick mà không gây sát thương | Test `refuel-evacuate` trong `tests/phase3.test.mjs` |
| AC-9 | Luật thắng bình minh | Hết giờ số đèn sáng >= ceil(0.6 * tổng đèn) thắng `dawn_survived`. Thắp hết đèn không kết thúc sớm | Test `dawn-survived` & `all-lit-continuous` |
| AC-10 | Chế độ mù màu | Settings lưu `colorblind`. Shade đổi viền `#00B3FF`, UI đổi `#FFFFFF ⚠`. Đèn tắt xẹp 20% và rách giấy; đèn yếu nhấp nháy | Test `phase3-modules.test.mjs` & Chrome screenshot |
| AC-11 | Playthrough Đêm 1 | Bot tự chơi Night 1 với seed 2026, thu thập, thắp và duy trì dầu để sống sót tới bình minh (lit >= 3) | `tests/playthrough.test.mjs` |
| AC-12 | Tính tất định & Benchmark | 3 đêm mô phỏng 21600 ticks trong headless đạt byte-identical và < 30s | `scripts/verify-phase3.mjs` -> `docs/proof/phase-3/verification.json` |
