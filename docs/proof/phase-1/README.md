# Bằng chứng Phase 1

Chạy lại `npm run verify`. Lệnh trả mã khác 0 khi test lỗi. `verification.json` ghi môi trường và so output hai lần chạy.

| Yêu cầu | Kiểm chứng |
|---|---|
| Tick 0, N bước, snapshot interval, end | tests.txt: tick 0 precedes input |
| Yaw, chuẩn hóa, frame giữ giá trị | tests.txt: movement normalization |
| Nhặt, capacity, khoảng cách XZ bao gồm biên | tests.txt: pickup uses inclusive horizontal radius |
| Nạp từng phần, cạnh nhấn, thắng 5 đèn | tests.txt: deposit transfers partially; win.scenario.json + win.inputs.json + win.jsonl |
| Tỏa sáng cost/radius/push/stun/cooldown | tests.txt: pulse cost; no light means no pulse |
| Hit/drop/bất tử/hết lửa | tests.txt: shade hit drops floor ratio |
| Đèn an toàn, scenario không cộng điểm | tests.txt: lit lantern excludes shades |
| Thắng/điểm/bình minh/kết thúc sớm | tests.txt: all_lit win score and dawn |
| Nhảy / không phạt rơi | tests.txt: jump is edge triggered |
| Validate / exit 2 | tests.txt: validators reject; real CLI writes JSONL |
| Tất định, id tự sinh | verification.json + deterministic.jsonl |
| Màn mặc định có thể hoàn thành | playthrough.json, điều khiển mô phỏng bằng input tới thắng |
| Game 3D, Mây/nón/đèn, HUD | title.png, gameplay.png, compact.png |
| Start, điều khiển, camera, pause/resume, resize, không lỗi JS | browser.json |

Browser: `npm start` rồi `node scripts/browser-check.mjs` (Chrome cài sẵn; BROWSER_CHANNEL=msedge cũng hỗ trợ). Ảnh từ trình duyệt thật. Test UI thắng/thua/chơi lại dùng scenario được chèn tại constructor qua Playwright route, không sửa source production: thắng đặt sẵn 4 đèn, đủ đốm để nạp đèn cuối bằng E; thua đặt 0,25 giây còn lại. Ảnh won-fixture.png và lost-fixture.png thể hiện fixture này, không phải người chơi đi hết màn. Nguyên màn mặc định được kiểm tra bằng mô phỏng. Chưa có bằng chứng chạy trực tiếp macOS/Linux hoặc số đo hiệu năng GPU; CI Ubuntu đã cấu hình nhưng chưa xác nhận kết quả.
