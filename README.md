# Đảo Đèn Lồng — bản chơi Phase 1

Game web 3D Đêm 1 – Đảo Bến. Mây gom đom đóm, thắp 5 Đèn Lồng Lớn và né Bóng Mực. Logic mô phỏng dùng chung giữa trình duyệt và headless, 60 tick/giây. Yêu cầu Node.js >=22, npm và trình duyệt hỗ trợ WebGL; chạy trên Windows, macOS hoặc Linux.

### Cài và chơi (3 lệnh sau khi clone)

```sh
npm ci
npm run build
npm start
```

Mở **http://localhost:5173**, chọn **Bắt đầu đêm 1**. Không cần API key hay dịch vụ bên ngoài khi chơi. Bản web tĩnh ở `dist/` cũng có thể phục vụ bằng HTTP server bất kỳ; không mở trực tiếp bằng `file://`.

### Điều khiển và luật

| Phím | Hành động |
|---|---|
| WASD | Di chuyển theo camera |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn chưa sáng gần nhất |
| F | Tỏa sáng: tốn 2 đốm, đẩy lùi và làm choáng Bóng Mực |
| Mũi tên trái/phải | Xoay camera |
| Esc / nút Tạm dừng | Tạm dừng; nút Tiếp tục để chơi tiếp |

Tự nhặt đom đóm trong bán kính 1,5 m, mang tối đa 20. Mỗi đèn cần 10 đốm, có thể nạp nhiều lần trong bán kính 3 m. Mỗi lần nhấn E/F/Space chỉ kích hoạt một lần; thả rồi nhấn lại để dùng tiếp. Bắt đầu với 3 ngọn lửa, giới hạn 300 giây. Bị chạm mất 1 ngọn lửa, mất `floor(carried × 0.5)` đốm và bất tử 2 giây. Đốm mất đi tan biến. Đèn sáng tạo vùng an toàn 5 m. Thắp đủ 5 đèn thì thắng; hết lửa hoặc hết giờ thì thua. Nút Chơi lại đặt lại toàn bộ màn.

Điểm: +10 mỗi đom đóm, +100 mỗi đèn, +20 mỗi Bóng Mực trúng tỏa sáng; khi thắng cộng `floor(giây còn lại) + 50 × ngọn lửa còn lại`. Các thông số chính xác được dùng trực tiếp từ [game.contract.json](game.contract.json).

### Test Contract v1.0 và bằng chứng

```sh
npm run verify
node src/headless.mjs --seed 42 --night 1 --ticks 600 --out output.jsonl
node src/headless.mjs --seed 42 --night 1 --scenario docs/proof/phase-1/win.scenario.json --inputs docs/proof/phase-1/win.inputs.json --ticks 100 --out win.jsonl --snapshot-every 10
```

`npm test` chạy test; `npm run verify` còn lưu bằng chứng và kiểm tra hai lần chạy có output giống hệt. Headless không dùng DOM, GPU hay thư viện Three.js. Tham số bắt buộc: `--seed`, `--night 1`, `--ticks`, `--out`; tùy chọn `--scenario`, `--inputs`, `--snapshot-every` (mặc định 10). File inputs/scenario sai trả mã 2; lỗi CLI/output trả mã 1; thành công trả mã 0. Output JSONL bắt đầu snapshot tick 0, có event khi xảy ra và luôn kết thúc bằng end. Chi tiết: [đặc tả](docs/specs/phase-1.md), [giả định](docs/notes/phase-1.md), [bảng bằng chứng](docs/proof/phase-1/README.md).

Browser smoke test (cần `npm start` đang chạy và Chrome cài sẵn): `node scripts/browser-check.mjs`. CI Linux chạy build và verify trên mỗi push/PR; trạng thái CI chỉ được xác nhận sau khi GitHub chạy.

### Sáng tạo của tôi

Lối đá hướng về 5 đèn, biển mây và vòng sáng vùng an toàn; đảo sáng dần theo số đèn. Tất cả chỉ thuộc lớp hiển thị, không thêm thực thể vào mô phỏng headless. [Ảnh gameplay](docs/proof/phase-1/gameplay.png) và [kiểm tra tất định](docs/proof/phase-1/verification.json).

Video demo và Release `v1.0.0` dành cho Phase 4, hiện chưa có. Nguồn asset/công cụ: [CREDITS.md](CREDITS.md). Tài liệu lab gốc được giữ bên dưới.

---

# Day 12 — AI SDLC: Đảo Đèn Lồng (tài liệu lab)

> **Cá nhân** (1 người / 1 MSSV) · Áp dụng SDLC cùng AI để xây một **game 3D** qua **4 phase**, từ yêu cầu ban đầu tới bản phát hành.
> **Lab board + trợ giảng:** **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**

---

## Tài liệu của lab

| File | Nội dung |
|---|---|
| [GUIDE.md](GUIDE.md) | Hướng dẫn làm lab: vòng làm việc mỗi phase, harness, kiểm chứng, token |
| [CHECKPOINTS.md](CHECKPOINTS.md) | Các mốc tự kiểm tra từ chuẩn bị đến nộp bài |
| [SUBMISSION.md](SUBMISSION.md) | Đặt tên repo, hạn nộp, tag, Release, video, checklist |
| [RULES.md](RULES.md) | Quy định: AI, trung thực về bằng chứng, bản quyền, bảo mật |
| [RUBRIC.md](RUBRIC.md) | Thang điểm chi tiết |

## Lab board

Yêu cầu dự án được phát hành tại **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**. Mỗi phase là một tab (tab chưa phát hành bị khóa), mỗi tab có trợ giảng AI riêng chỉ trả lời trong phạm vi phase đó. Trợ giảng cần đăng nhập claude.ai và dùng lượt Claude của bạn.

## Dự án

**Đảo Đèn Lồng**: game 3D góc nhìn thứ ba. Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.

- Không ràng buộc công nghệ; chạy được trên macOS hoặc Linux.
- Tuân theo **Test Contract** (chế độ headless) để được chấm tự động và so sánh với nhau.

| Phase | Bạn nhận | Nộp |
|---|---|---|
| 1 | **PRD-0** (mô tả tổng quát) + Test Contract | tag `phase-1` |
| 2 | **Ticket-02**, phát hành khi Phase 1 kết thúc | tag `phase-2` |
| 3 | **Ticket-03**, phát hành khi Phase 2 kết thúc | tag `phase-3` |
| 4 | **Ticket-04**, phát hành khi Phase 3 kết thúc | tag `phase-4` + Release `v1.0.0` |

Yêu cầu sẽ được bổ sung và có thể thay đổi giữa các phase, giống dự án thật.

### Lịch 4 giờ

Bài lab kéo dài **4 giờ**. Phase 1 và 2 khoảng **1 giờ**, Phase 3 khoảng **30 phút**, Phase 4 khoảng **1 giờ 30 phút**. Mỗi phase phát hành đúng mốc giờ. Phase mới xuất hiện trên lab board khi tới mốc.

| Mốc | Sự kiện | Hạn tag |
|---|---|---|
| 0h | Phát hành **Phase 1** (PRD-0), gồm cả phần chuẩn bị | `phase-1` trước mốc 1h |
| 1h | Phát hành **Phase 2** | `phase-2` trước mốc 2h |
| 2h | Phát hành **Phase 3** | `phase-3` trước mốc 2h30 |
| 2h30 | Phát hành **Phase 4** | `phase-4`, Release `v1.0.0` và video trước mốc 4h |
| 4h | Hết giờ lab, chốt bài | |

Hết giờ mỗi phase thì tag và chuyển sang phase tiếp theo, dù phase chưa hoàn hảo. Chỗ chưa xong ghi trung thực trong bằng chứng.

---

## Gợi ý SDLC (cách làm là của bạn)

Mỗi phase là một vòng nhỏ. Công cụ, thứ tự, định dạng tài liệu đều tự do; đây chỉ là gợi ý:

1. **Requirements:** biến yêu cầu thành tiêu chí nghiệm thu kiểm chứng được. Chỗ mơ hồ thì tự giả định và ghi lại.
2. **Plan:** nghĩ cách kiểm chứng **trước** khi để agent viết code.
3. **Build:** để agent viết, bạn điều phối và review.
4. **Verify:** chạy thật, kiểm tra hành vi thật. *Không có bằng chứng thì chưa xong*: "agent bảo chạy rồi" không phải bằng chứng.
5. **Evaluate:** cái gì đạt, AI sai ở đâu, harness (AGENTS.md, skill, hook) cần chỉnh gì.
6. **Release:** gắn tag.

## Ba điều cần nhớ

> Bạn được **tự do sáng tạo thêm** quanh phần lõi (nhân vật, cơ chế nhỏ, câu chuyện, hiệu ứng, âm thanh…). Sáng tạo gọn và không phá yêu cầu được tính điểm trong hạng mục F của [RUBRIC](RUBRIC.md); ghi mục "Sáng tạo của tôi" trong README của bạn.

- **Game tốt là game đúng yêu cầu của khách hàng**, không phải game phức tạp hay đẹp nhất. Làm đúng và chứng minh được là đúng trước, trau chuốt sau.
- **Cân nhắc kỹ quota token của bạn.** Đốt nhiều token không làm bài tốt hơn. Ngữ cảnh gọn, kế hoạch rõ, kiểm chứng sớm thường vừa rẻ vừa đúng hơn chạy agent liên tục.
- **Kiểm chứng là phần quan trọng nhất.** Bằng chứng (test, output headless, ảnh, số đo) đáng giá hơn lời mô tả.

---

## Bàn giao cuối cùng

Một **repo GitHub cá nhân, public**, gồm:

1. **Toàn bộ mã nguồn** của game qua 4 phase, tag `phase-1` … `phase-4`, Release `v1.0.0`.
2. **Video demo `.mp4` dưới 5 phút** (đính kèm Release `v1.0.0` hoặc `docs/demo/demo.mp4`, link ở đầu README): chơi thử và cho thấy bằng chứng game chạy đúng.
3. **Bằng chứng kiểm chứng** của từng phase (định dạng tự chọn).
4. **Harness AI đã dùng** (AGENTS.md / CLAUDE.md, skills, hooks, plugins…), giữ nguyên trong repo và lịch sử git.
5. **Ghi chép ngắn:** spec/giả định mỗi phase, nhật ký dùng AI (gồm token/chi phí ước tính), retro.

Không commit API key, token hay `.env`. Gửi link repo theo hướng dẫn của Coach.

## Đánh giá (100 điểm)

| Hạng mục | Điểm |
|---|---|
| Test tự động ẩn (headless, gồm kiểm tra lại phase trước) | 30 |
| Kiểm chứng & bằng chứng của bạn | 20 |
| Quy trình SDLC & harness AI | 15 |
| Evaluation & retro (gồm cách bạn dùng token) | 10 |
| Hiệu năng & ổn định | 10 |
| Chất lượng sản phẩm (đúng yêu cầu, chơi được) | 10 |
| Video demo | 5 |

## Quy định

- Dùng AI thoải mái; không sao chép repo của người khác.
- Bằng chứng phải thật: test luôn đạt hay output sửa tay là vi phạm.
- Nhân vật, bối cảnh là bản gốc của lab; asset bên ngoài chỉ dùng loại CC0/CC-BY/MIT hoặc tự tạo, ghi nguồn trong `CREDITS.md`.
