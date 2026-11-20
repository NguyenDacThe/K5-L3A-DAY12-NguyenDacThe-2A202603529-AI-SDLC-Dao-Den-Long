# Changelog — Đảo Đèn Lồng

Toàn bộ các thay đổi qua từng Phase của dự án Đảo Đèn Lồng.

## [1.0.0 / Phase 4 / Contract v1.3] — Bình minh

- Benchmark có cảnh chuẩn200shade/100mote, cameraquay15s, warmup3s, frame statistics vàsceneaudit; trảnullRSSweb vàfalsevsync khi không xácnhậnđược.
- Soak10đêm mộtprocess, seedvàinputPRNG, lifecycle reset/GC vàRSSgate20%.
- Bảngđiểmcụcbộ top10, tiebytime, tên3–12/Unicode, điểmchỉđêmthắng, exportCLI/UI.
- Đổi9phím có báo trùng/reset/lưu; cues spawn/direction/wind/countdown/oil; reduce-motion, UI18px vàchữlớn.
- Tách adapterfilesystem khỏibrowser, sửa điểm0/fallbackđêmthua và doubleinsert của bản đangdở. Game/headlessv1.2 không đổi luật.
- ZIPweb độc lập, MP4demo, retro/bằngchứng vàReleasev1.0.0.

---

## [Phase 3 / Contract v1.2] — Ticket-03 "Đèn cạn dầu"

### ⚠ Breaking Changes (Thay đổi phá vỡ tương thích)

1. **Thay thế luật thắng sớm `all_lit` bằng `dawn_survived`**:
   - Thắp đủ toàn bộ đèn trên đảo không còn kết thúc đêm sớm.
   - Trò chơi tiếp tục đến khi hết thời gian đêm (bình minh).
   - Điều kiện thắng: Mây còn sống và số đèn đang sáng tại tick cuối đạt tối thiểu 60% tổng số đèn trên đảo (`lit >= ceil(0.6 * count)`):
     - Đêm 1: tối thiểu 3 / 5 đèn sáng
     - Đêm 2: tối thiểu 4 / 6 đèn sáng
     - Đêm 3: tối thiểu 5 / 7 đèn sáng
   - Lý do kết thúc: Thắng ghi `dawn_survived`; Hết giờ không đủ đèn ghi `dawn`; Hết ngọn lửa ghi `no_flames`. Mã lý do `all_lit` chính thức bị loại bỏ.

2. **Thay thế toàn bộ công thức tính điểm cũ**:
   - Điểm nạp đom đóm: đổi từ +10 điểm/đốm thành **+5 điểm/đốm** (áp dụng cho cả thắp mới, thắp lại và châm dầu).
   - Thắp lần đầu: **+100 điểm**.
   - Thắp lại: **+40 điểm**.
   - Tỏa Sáng làm choáng Bóng Mực: **+5 điểm** mỗi con; đặc biệt nhận **tổng +15 điểm** nếu trước đó bóng đang hút dầu (`drain`).
   - Thưởng bình minh (chỉ cộng khi thắng): **+50 + floor(fuel)** cho mỗi đèn đang sáng; **+50 điểm** cho mỗi Ngọn Lửa còn lại.
   - Thưởng thời gian còn lại: **Bị loại bỏ hoàn toàn** (+0 thay vì +2/giây).

3. **Thay thế luật "đèn đã sáng không nhận thêm đom đóm" bằng cơ chế Nhiên liệu (`fuel`)**:
   - Mỗi ngọn đèn có dung tích tối đa 100 nhiên liệu (`fuel_max: 100`).
   - Khi thắp (lần đầu hoặc thắp lại), đèn khởi tạo với `fuel = 100`.
   - Trong khi sáng, đèn tự động hao hụt **1.0 fuel/giây** (1/60 mỗi tick).
   - Bấm tương tác tại đèn đang sáng để châm dầu (refuel): tiêu thụ `used = min(carried, ceil((100 - fuel) / 10))` đom đóm, phục hồi `10 * used` fuel (tối đa 100).
   - Đèn đầy dầu (100) không được chọn tương tác, không phát sự kiện, không cộng điểm.
   - Khi `fuel <= 0`, đèn tắt, `deposited = 0`, ghi nhớ `ever_lit = true`, phát sự kiện `lantern_out`.
   - Thắp lại đèn cũ (`ever_lit: true`) chỉ tốn **5 đom đóm** (`relight_cost: 5`).

4. **Thay thế luật "Bóng Mực không bao giờ vào vùng an toàn" bằng cơ chế Hút dầu (`drain`)**:
   - Đèn có `fuel < 30` bị mất vùng an toàn 6m (đúng 30 vẫn còn an toàn).
   - Bóng Mực ở trạng thái `wander` ưu tiên tìm tới đèn sáng có `fuel < 30` gần nhất.
   - Khi cách đèn yếu <= 2 m (XZ), Bóng Mực chuyển sang trạng thái mới `drain`, đứng yên và rút **5 fuel/giây** (5/60 mỗi tick).
   - Khi đèn được châm dầu lên >= 30, vùng an toàn 6m phục hồi, các Bóng Mực trong vùng bị đẩy lùi ra mép trong 30 tick và không gây sát thương lúc đó.

5. **Thay đổi thời lượng các đêm**:
   - Đêm 1: đổi từ 300s thành **240s**.
   - Đêm 2: đổi từ 330s thành **270s**.
   - Đêm 3: đổi từ 360s thành **300s**.

6. **Thay đổi Test Contract v1.2 (Snapshot, Scenario, Events)**:
   - Snapshot:
     - `lanterns[]` bổ sung `fuel` (số thực 1 chữ số thập phân, tắt ghi 0), `ever_lit` (boolean), `relit_count` (integer).
     - `player` bổ sung `capacity` (integer).
     - `shades[].state` có thêm trạng thái `drain`.
   - Scenario:
     - `lanterns[]` cho phép đặt `lit`, `fuel`, `ever_lit`. Đèn đặt `lit: true` không có `fuel` mặc định là 100.
     - `player` bổ sung `successful_lights`.
     - `shades[]` bổ sung `target_lantern_id`.
   - Events mới:
     - `refuel { lantern_id, amount, fuel }`
     - `lantern_out { lantern_id }`
     - `fuel_drain { lantern_id, shade_id, fuel }` (ghi mỗi 60 tick khi đang hút)
     - `lantern_lit` bổ sung trường `relight: true|false`.

---

### ⭐ New Features (Tính năng mới)

1. **Sức chứa tăng dần (Dynamic Carry Capacity)**:
   - Sức chứa túi đom đóm của Mây mở rộng theo tiến trình thắp đèn trong đêm:
     `capacity = min(20, 10 + 2 * successful_lights)`.
   - Đặt lại về 10 vào đầu mỗi đêm. HUD hiển thị trực quan `đang mang / sức chứa` cùng số ô sáng tương ứng.

2. **Chế độ mù màu & Trợ năng (Accessibility & Colorblind Mode)**:
   - Cài đặt "Bảng màu dễ phân biệt" được lưu cố định vào trình duyệt:
     - Viền và mắt Bóng Mực đổi từ `#7A3CFF` sang `#00B3FF`.
     - Màu cảnh báo UI đổi từ `#FF5A5F` sang `#FFFFFF` kèm ký hiệu ⚠.
     - Đèn tắt bị xẹp 20% (scale.y = 0.96) và xuất hiện vết rách giấy trên bề mặt.
     - Đèn và thanh nhiên liệu có `fuel < 30` tự động nhấp nháy 1 Hz để nhận biết nguy hiểm từ xa.

---

## [Phase 2 / Contract v1.1] — Ticket-02 "Ba hòn đảo"
- Chiến dịch 3 đêm với địa hình độc lập: Đảo Khởi Nguyên, Hai Hòn Đảo, Tháp Gió.
- Kẻ địch mới Gió Lạc (Drifter) cướp đom đóm.
- Bùa Gió (Charm) chạy nhanh và lướt liên tục không cooldown.
- Đệm nảy (Pad) phóng nhân vật qua đảo hoặc lên tháp.
- Gió mạnh định kỳ ở Đêm 3 đẩy lùi nhân vật 2 m/s.
- Cơ chế lướt (Dash), rơi mây (Cloud fall), và rơi đom đóm khi bị trúng đòn.

---

## [Phase 1 / Contract v1.0] — PRD-0
- Game gốc: Đảo Đèn Lồng, Mây thu thập đom đóm thắp sáng 5 ngọn đèn.
- Mô phỏng tất định headless CLI.
- Điều khiển di chuyển, nhảy, nạp đèn, Tỏa Sáng đẩy lùi Bóng Mực.
