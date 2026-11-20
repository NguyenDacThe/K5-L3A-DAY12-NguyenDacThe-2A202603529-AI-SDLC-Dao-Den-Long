# Phase 4 — hoàn thiện bản Antigravity và phát hành

Đầu lượt làm việc đã có commit Phase3, tagphase-3 và phần Phase4 chưa commit do Antigravity tạo: UI accessibility, server scoreboard, bench/soak khung. Giữ và hoàn thiện phần này; không lùi hoặc thay tag cũ.

## Sửa và tiêu chí nghiệm thu

| Yêu cầu | Kết quả kiểm chứng |
|---|---|
| Benchmark chuẩn | createBenchmark tạo200shade wander đều theo diện tích đĩa,100mote,3đèn100fuel; không gọi gameplaystep, giữspawn/pickup/damage/decay/end tắt; vẫn gọi chính moveShades của game với phát hiện người chơi tắt |
| Camera/đo | Cửa sổChrome1280x720, quay30m/Y15, điểm đầu(30,15,0), vòng15s;3s warmup từ khung đầu, đo đúng30000ms; stats puretest kiểm tra mean/worst1%/p95 |
| Load/RSS/vsync | load từ khởi động Node qua khung render đầu; browserRSS không đo được nên null; không bảo đảm tắt RAFsync nên false, có ghi README |
| Soak |10đêm 1→2→3, seed7+i, cùngprocess; PRNGinput riêng đúng xác suất, mỗi30tick đổi hướng; crash/memorylimit trảexit1 |
| Mốc RSS | Engine/JIT warmup1200tick trước đo; GC trước hai mốc; start sau tải đêm đầu, end sau reset cuối. Không cộng bộ nhớ giả vào baseline. Giữ dữ liệu đầy đủ trong soak.json |
| Scoreboard | Tên3–12, Unicodeletters là mở rộng; top10, tie theo thời điểm; localStorage browser + filedata khi chạy serverlocal; xuấtUIJSON và run_cmd--export-leaderboard |
| Settings |9hành động đổi được, trùng phím báo, Escape giữ cho pause; restoredefaults, lưureload; giảmchuyểnđộng và1.25xtext |
| Visualcues | Spawn cósubtitle + mũitênbiên; gió/countdown10s/đènyếu cóchỉbáo; textUI>=18px ở1280x720 |
| Release | ZIPweb không cần npm, nguồn qua GitHub, videoMP4 thật, benchmark/soakcommit, retro và changelog4phase |

## Lỗi phát hiện và sửa

- Bench cũ gán fuel/capacity getter, có thể không dựng được cảnh; thay bằng factory đúng. Phân bố ban đầu cụm quanh điểm sinh, đổi sang uniform-diskPRNG.
- Bộ nhớ bench cũ đo Nodeharness chứ không phải Chrome; trảnull đúng ngoại lệ bảnweb. Không báo vsync_off=true chỉ vì có flag.
- Soak cũ chỉ cảnh báo tăngRSS và có báo cáo37→48MiB (>20%). Sửa vòng đời/GCđối xứng, warmupJIT rõ ràng; số mới phải do chạy thật, không sửa số.
- Scoreboard cũ có thể lấy điểm đêm thua khi total=0, lưu trùng khi đọc lại sauPOST; dùngtổngthắng trực tiếp và một lần append. Tách node:fs khỏibrowsermodule. Escape khi đổi phím tránh trùng forcedpause.
- Retarget kiểm chứng sang phase4, bảo toàn bằng chứng phase3. Source tệp web-v11/game-v11 giữ tên để không phá đường dẫn hosting; contract thực tế1.3.

## Giới hạn xác nhận

Số benchmark tự đo là tham khảo trên máy ghi tại verification.json; chưa đo trên máy chấm/hidden tests. Screenshot leaderboard-fixture dùng scenario thua để kiểm tra lưu0, không mô tả như lượt chơi thắng thật. Demo là ghi hình browser với bàn phím tự động, sau đó hiển thị report đọc từ lần chạy thật; đoạnbench trong demo5s khác phép đo chuẩn30s được đính kèm. MP4 không thu systemaudio; âm thanh gameplay vẫn có trong app.
