# Đảo Đèn Lồng — hướng dẫn cho agent

- Đọc README.md, GUIDE.md, RULES.md và tài liệu phase hiện tại trước khi sửa game.
- Phase hiện tại: 4 / Contract v1.3. Đọc docs/specs/phase-4-ticket.txt; giữ các luật dầu/drain/dawn của Phase3 và số chuẩn Phase2.
- Tách logic mô phỏng khỏi hiển thị; sản phẩm phải chạy trên macOS hoặc Linux.
- Giả định và bàn giao: docs/notes/phase-4.md; hồi quy đổi luật xem CHANGELOG.md và ADR Phase3.
- Node 24.x: `npm ci`, `npm run build`, `npm start`, `npm test`; headless: `node src/headless.mjs --seed 42 --night 1 --ticks 600 --out output.jsonl`.
- Vercel: project gamedemo, root repo, Other, npm ci / npm run build / dist (vercel.json). `npm run preview` chỉ phục vụ dist. Library web nằm ở vendor/three, không dùng URL node_modules. Không commit .vercel/ hoặc env từ CLI.
- `npm run verify`: fail-fast, test + scenario + tất định/headless đủ3đêm, ghi docs/proof/phase-4. Không ghi đè proof cũ.
- `npm run bench -- --seed 42 --duration 30 --out bench.json`: Chrome cửa sổ1280x720, warmup3s, cảnh chuẩn200shade/100mote. RSSweb=null; không nhận vsync đã tắt nếu chỉ truyền flagbrowser.
- `npm run soak -- --seed 7 --nights 10 --out soak.json`: cùng tiến trình, đoRSSsymmetric sauGC, inputPRNG riêng; tăng>20% phải fail, không sửa output.
- Leaderboard purebrowser ở leaderboard.mjs; fs chỉ trong leaderboard-file.mjs, không import node:fs vào module web. Điểm lưu chỉ là tổng đêm thắng, kể cả0.
- Có server và Chrome: `node scripts/browser-check.mjs`; GAME_URL đổi URL khi cổng mặc định 5173 bận.
- Giữ tick và sim_tick riêng khi pause; thực hiện thứ tự tick theo ticket. Pickup xét XZ + chênh cao, pulse xét 3D, điểm đom đóm cộng khi nạp. Spawn cuối bước, chỉ tương tác từ bước sau.
- Chạy kiểm chứng thật trước khi báo hoàn thành; lưu input, output, kết quả và cách tái lập trong docs/proof/.
- Không sửa tay bằng chứng, không viết test luôn đạt. Ghi rõ phần chưa đạt hoặc chưa kiểm chứng.
- Giữ harness và tag phase-1/2/3. Trước tag phase-4/v1.0.0: build/test, bench/soak thật, browserQA, ZIPweb, MP4<5phút và tài liệu. Không công bố kiểm thử chưa chạy.
- Không commit .env, key, token, dependencies hoặc bản build. Ghi nguồn asset trong CREDITS.md khi sử dụng.
