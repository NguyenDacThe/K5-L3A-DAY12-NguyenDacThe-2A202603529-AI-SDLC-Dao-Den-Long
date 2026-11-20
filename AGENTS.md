# Đảo Đèn Lồng — hướng dẫn cho agent

- Đọc README.md, GUIDE.md, RULES.md và tài liệu phase hiện tại trước khi sửa game.
- Yêu cầu Phase 1 và Test Contract được ghi tại docs/specs/phase-1.md từ nội dung người dùng cung cấp. Không tự bịa contract.
- Tách logic mô phỏng khỏi hiển thị; sản phẩm phải chạy trên macOS hoặc Linux.
- Ghi giả định và tiêu chí nghiệm thu trong docs/notes/phase-1.md; cập nhật khi yêu cầu được làm rõ.
- Node >=22: `npm ci`, `npm run build`, `npm start`, `npm test`; headless: `node src/headless.mjs --seed 42 --night 1 --ticks 600 --out output.jsonl`.
- Chạy `npm run verify` trước khi kết thúc: lệnh này dừng khi test đỏ, chỉ sinh bằng chứng sau khi test qua. Có server đang chạy và Chrome: `node scripts/browser-check.mjs`.
- Chạy kiểm chứng thật trước khi báo hoàn thành; lưu input, output, kết quả và cách tái lập trong docs/proof/.
- Không sửa tay bằng chứng, không viết test luôn đạt. Ghi rõ phần chưa đạt hoặc chưa kiểm chứng.
- Giữ file harness và lịch sử git. Không tạo tag phase-1 trước khi đối chiếu bàn giao trong PRD-0.
- Không commit .env, key, token, dependencies hoặc bản build. Ghi nguồn asset trong CREDITS.md khi sử dụng.
