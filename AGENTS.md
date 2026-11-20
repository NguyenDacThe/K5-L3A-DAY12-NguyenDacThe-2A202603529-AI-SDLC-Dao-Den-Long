# Đảo Đèn Lồng — hướng dẫn cho agent

- Đọc README.md, GUIDE.md, RULES.md và tài liệu phase hiện tại trước khi sửa game.
- Phase hiện tại: 2 / Contract v1.1. Đọc docs/specs/phase-2.md và phase-2-ticket.txt; thông số chuẩn thay giả định Phase 1.
- Tách logic mô phỏng khỏi hiển thị; sản phẩm phải chạy trên macOS hoặc Linux.
- Ghi giả định trong docs/notes/phase-2.md; acceptance criteria cho mục 3 của ticket ở docs/specs/phase-2.md.
- Node >=22: `npm ci`, `npm run build`, `npm start`, `npm test`; headless: `node src/headless.mjs --seed 42 --night 1 --ticks 600 --out output.jsonl`.
- Chạy `npm run verify` trước khi kết thúc: fail-fast, test + scenario + determinism + benchmark 3 đêm, ghi docs/proof/phase-2. Không ghi đè bằng chứng Phase 1.
- Có server và Chrome: `node scripts/browser-check.mjs`; GAME_URL đổi URL khi cổng mặc định 5173 bận.
- Giữ tick và sim_tick riêng khi pause; thực hiện thứ tự tick theo ticket. Pickup xét XZ + chênh cao, pulse xét 3D, điểm đom đóm cộng khi nạp. Spawn cuối bước, chỉ tương tác từ bước sau.
- Chạy kiểm chứng thật trước khi báo hoàn thành; lưu input, output, kết quả và cách tái lập trong docs/proof/.
- Không sửa tay bằng chứng, không viết test luôn đạt. Ghi rõ phần chưa đạt hoặc chưa kiểm chứng.
- Giữ harness, lịch sử git và tag phase-1. Chỉ tag phase-2 sau khi kiểm tra Contract v1.1; thay test cũ phải ghi lý do trong ghi chú phase.
- Không commit .env, key, token, dependencies hoặc bản build. Ghi nguồn asset trong CREDITS.md khi sử dụng.
