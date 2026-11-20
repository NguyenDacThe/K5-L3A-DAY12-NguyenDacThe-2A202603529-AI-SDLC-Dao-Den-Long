# Bằng chứng Phase 2

Tái lập toàn bộ test/scenario/determinism/headless benchmark: `npm run verify`. Thất bại trả mã khác0. Browser: chạy server `npm start` rồi `node scripts/browser-check.mjs` (Chrome). Các tệp được sinh bằng chương trình, không chỉnh output để khớp expectation.

| Cơ chế | Scenario / bằng chứng |
|---|---|
| Dash / giữ độ cao | dash, air-dash |
| Charm / tốc độ / dash không hồi | charm, charm-dash |
| Gió Lạc cướp, bỏ qua invuln, trước hit | steal |
| Pulse trả đồ tại chỗ | drifter-drop |
| Pulse3D / đẩy15tick | pulse-3d |
| Fall một lần / mấtđồ / respawn60 | fall |
| Bục2đảo / bục lên tầng2 | pad, tower-pad |
| Dốc lên tầng1 | ramp |
| Pause/tick/sim_tick/timer | pause |
| Gió chu kỳ30s / vận tốc2m/s | wind |
| Spawnshade/drifter theo lịch | spawn |
| Đốm hit TTL480, born sau pickup | hit-drops |

Mỗi tên có `.scenario.json`, `.inputs.json`, `.jsonl`. Dùng --seed42, --snapshot-every1 và số ticks/night ở tests/phase2-cases.mjs để chạy lại chính xác. Riêng wind snapshot-every10. tests.txt chứa kết quả kiểm tra expectation; verification.json ghi CPU/RAM/OS/Node, benchmark và SHA256 của hai lần chạy giống nhau. Benchmark bật spawn mặc định, thêm invuln_ticks30000 để chạy trọn thời lượng, có ghi options đầy đủ.

playthrough.json: bot điều khiển nguyên màn Đêm1 mặc định seed2026 tới thắng (không sửa state). browser.json: kiểm tra trình duyệt + FPS thực tế1280×720. menu.png và night1.png là game mặc định; ảnh `*-fixture.png` dùng scenario chèn tại constructor bằng Playwright route để kiểm tra flow/các màn kết quả, không phải ảnh chơi tay hoàn tất. win fixture đặt đủđốm và thắp sẵn cácđèn trừL1; loss fixture time_left_s=.25. Những thay đổi này chỉ trong kiểm thử, source production không đổi.

Giới hạn: benchmark không thay cho hiệu năng mọi máy; chưa chạy hiddentests/độc lập, chưa chơi tay trọn3đêm, chưa xác nhận CI Linux và âm thanh nghe thực tế. Bằng chứng Phase1 tái lập bằng checkout tagphase-1, không dùng tuningv1.1 so output cũ.
