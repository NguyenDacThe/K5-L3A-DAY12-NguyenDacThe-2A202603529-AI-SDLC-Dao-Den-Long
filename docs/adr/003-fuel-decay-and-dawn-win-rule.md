# ADR 003: Chuyển đổi mô hình trạng thái đèn có nhiên liệu và luật thắng bình minh

## Trạng thái (Status)
Chấp nhận (Accepted) — Triển khai trong Phase 3 / Contract v1.2

## Ngữ cảnh (Context)
Trong Phase 1 và Phase 2, trạng thái của đèn lồng là nhị phân (`lit: false` hoặc `lit: true`). Một khi đã nạp đủ 10 đom đóm, đèn sáng vĩnh viễn và không nhận thêm đom đóm. Đồng thời, điều kiện thắng đêm là thắp sáng toàn bộ đèn trên đảo (`all_lit`).
Kết quả playtest thực tế cho thấy những người chơi có kỹ năng tốt hoàn thành thắp toàn bộ đèn chỉ trong vòng chưa đầy 2 phút (so với thời lượng 300s/330s/360s). Điều này khiến nửa sau của đêm trở nên nhàn rỗi, triệt tiêu sự căng thẳng và nhịp độ thử thách.

## Quyết định thiết kế (Decision)

### 1. Mô hình trạng thái nhiên liệu của đèn (`Lantern Fuel State Machine`)
- Đèn lồng được mở rộng từ nhị phân sang mô hình nhiên liệu liên tục [0, 100].
- Khi vừa thắp (lần đầu hoặc thắp lại): `fuel = 100`.
- Trong khi sáng, đèn liên tục hao hụt nhiên liệu với tốc độ 1.0 đơn vị/giây (1/60 fuel mỗi tick).
- Khi `fuel <= 0`, đèn chuyển về trạng thái tắt (`lit = false`, `deposited = 0`), phát sự kiện `lantern_out` và ghi nhớ `ever_lit = true`.
- Đèn đã từng sáng (`ever_lit: true`) khi thắp lại chỉ cần 5 đom đóm (`relight_cost = 5`).
- Người chơi có thể châm thêm dầu (refuel) cho đèn đang sáng bằng cách bấm tương tác: nạp tối đa số đom đóm cần thiết `used = min(carried, ceil((100 - fuel) / 10))`.
- Để tránh sai số số thực giữa các môi trường hệ điều hành (Node.js trên macOS, Linux, Windows), toàn bộ mô phỏng tính nhiên liệu theo đơn vị số nguyên: `1 đơn vị fuel = 60 units` (`FUEL_SCALE = 60`). Hao hụt tự nhiên là 1 unit/tick, Bóng Mực hút là 5 units/tick. Chỉ làm tròn 1 chữ số thập phân khi xuất ra snapshot/event.

### 2. Hành vi Bóng Mực hút dầu (`Shade Drain Mechanics`)
- Đèn có `fuel < 30` bị mất vùng an toàn 6m (đúng 30 vẫn an toàn).
- Bóng Mực ở trạng thái `wander` ưu tiên tiếp cận đèn sáng có `fuel < 30` gần nhất.
- Khi khoảng cách XZ <= 2m, Bóng Mực chuyển sang trạng thái mới `drain`, đứng yên và rút 5 fuel/giây (5/60 mỗi tick). Nhiều bóng hút cùng lúc sẽ cộng dồn tốc độ hao hụt.
- Thoát trạng thái `drain`: chuyển sang `chase` nếu Mây vào trong 6m; chuyển sang `stunned` nếu trúng Tỏa Sáng (+15 điểm); chuyển sang `wander` nếu đèn tắt, fuel >= 30 hoặc cách đèn > 2m.
- Khi người chơi nạp dầu đưa fuel lên >= 30, vùng an toàn được tái lập, các Bóng Mực trong bán kính 6m bị đẩy lùi ra mép trong tối đa 30 tick và không gây sát thương trong giai đoạn này.

### 3. Luật thắng mới: Giữ đảo sáng tới bình minh (`Dawn Survival`)
- Loại bỏ hoàn toàn cơ chế thắng sớm (`all_lit`). Thắp đủ toàn bộ đèn không còn kết thúc đêm sớm.
- Thắng đêm (`dawn_survived`): Khi hết thời gian đêm (bình minh) mà Mây còn sống và số đèn đang sáng >= ceil(0.6 * tổng số đèn). Cụ thể:
  - Đêm 1: tối thiểu 3 / 5 đèn sáng
  - Đêm 2: tối thiểu 4 / 6 đèn sáng
  - Đêm 3: tối thiểu 5 / 7 đèn sáng
- Thua: Hết Ngọn Lửa (`no_flames`) tại bất kỳ thời điểm nào (kể cả tick cuối), hoặc khi hết thời gian mà số đèn sáng dưới 60% (`dawn`).

### 4. Sức chứa tăng dần (`Dynamic Carry Capacity`)
- Để tạo cảm giác tiến trình trong đêm, sức chứa mang đom đóm của Mây bắt đầu từ 10 và tăng thêm 2 sau mỗi lần thắp thành công (cả thắp mới và thắp lại), tối đa 20 (`capacity = min(20, 10 + 2 * successful_lights)`).

### 5. Khả năng tiếp cận: Chế độ mù màu (`Accessibility & Colorblind Mode`)
- Bổ sung tùy chọn "Bảng màu dễ phân biệt" trong phần Cài đặt và lưu trữ cố định.
- Chuyển màu viền và mắt Bóng Mực từ tím `#7A3CFF` sang xanh dương sáng `#00B3FF`.
- Chuyển màu cảnh báo UI từ đỏ `#FF5A5F` sang trắng `#FFFFFF` kèm ký hiệu ⚠.
- Mô hình 3D của đèn tắt bị xẹp 20% và xuất hiện vết rách giấy; đèn có fuel < 30 nhấp nháy 1 Hz để người chơi phân biệt rõ ràng mà không cần phụ thuộc vào màu sắc.

## Hệ quả (Consequences)
- Lối chơi nửa sau của đêm trở nên kịch tính, đòi hỏi người chơi liên tục phân bổ thời gian giữa việc gom đom đóm, thắp đèn mới, tuần tra bảo vệ đèn yếu và xua đuổi Bóng Mực hút dầu.
- Tính tất định (determinism) của game được bảo toàn 100% nhờ việc chuẩn hóa tính toán nhiên liệu theo đơn vị tick nguyên vẹn.
- Tất cả các hợp đồng và công cụ kiểm thử được nâng cấp đồng bộ lên Contract v1.2.
