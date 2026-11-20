# Đảo Đèn Lồng — Phase 2 · Ba Đêm

Game web 3D qua 3 đêm, theo Ticket-02 và Test Contract **v1.1**. Mây gom đom đóm, thắp đèn, né Bóng Mực và Gió Lạc, dùng dash, bục nhảy và Bùa Gió. Logic mô phỏng dùng chung giữa web/headless, 60 tick/giây. Cần Node.js >=22, npm và trình duyệt WebGL; bản web chạy trên Windows/macOS/Linux.

### Cài và chơi (3 lệnh sau khi clone)

```sh
npm ci
npm run build
npm start
```

Mở **http://localhost:5173**, chọn **Bắt đầu hành trình**, đọc lời Ông Đăng rồi bắt đầu đêm. Không cần API key/dịch vụ bên ngoài khi chơi. `dist/` là bản web tĩnh, dùng HTTP server để phục vụ; không mở bằng `file://`.

### Điều khiển và luật

| Phím | Hành động |
|---|---|
| WASD | Di chuyển theo camera |
| Space | Nhảy |
| Shift | Lướt 14 m/s trong 0,2 giây, hồi 1,5 giây |
| E | Nạp đom đóm vào đèn chưa sáng gần nhất |
| F | Tỏa sáng: tốn 3 đốm, hồi 3 giây |
| Mũi tên trái/phải hoặc kéo chuột | Xoay camera |
| Esc / P / nút Tạm dừng | Tiếp tục, chơi lại đêm, cài đặt hoặc về menu |

Mang tối đa **10**, tự nhặt trong 1 m và chênh cao <=1,5 m. Mỗi đèn cần10, có thể nạp nhiều lần trong2 m. Các hành động chỉ kích hoạt khi vừa nhấn. Hit mất1 lửa, rơi nửa số đốm (nhặt lại trong8 giây), bất tử1,5 giây. Đèn sáng bảo vệ6 m. Rơi Y<-10 mất1 lửa và toàn bộ đốm, hồi sinh sau1 giây. Đêm1/2/3 có5/6/7 đèn, thời lượng300/330/360 giây, bắt đầu với3 lửa. Thắp đủ đèn thắng; hếtlửa hoặc bìnhminh thua. Tổng chỉ cộng điểm những đêm đã thắng.

Điểm chuẩn: **+10 mỗi đom đóm nạp**, +100 mỗi đèn, +5 mỗi Bóng Mực trúng tỏa sáng; thắng cộng `floor(giây còn lại) × 2 + 50 × ngọn lửa còn lại`. Bùa Gió tăng tốc7,2 m/s và bỏ cooldown dash trong10 giây, hồi45 giây. Gió Lạc cướp tối đa3 đốm; tỏa sáng vào nó khi đang chạy trốn để lấy lại. Cài đặt âm lượng/độ nhạy chuột được lưu; âm thanh tổng hợp bật sau tương tác đầu tiên. Xem [thông số](game.contract.json) và [giả định](docs/notes/phase-2.md).

### Test Contract v1.1 và bằng chứng

```sh
npm run verify
node src/headless.mjs --seed 42 --night 1 --ticks 600 --out output.jsonl
node src/headless.mjs --seed 42 --night 2 --scenario docs/proof/phase-2/steal.scenario.json --inputs docs/proof/phase-2/steal.inputs.json --ticks 1 --out steal.jsonl --snapshot-every 1
```

`npm test` chạy test; `npm run verify` chạy thêm scenario, so byte-output, đo headless đủ3 đêm và ghi bằng chứng Phase2. Headless không dùng DOM/GPU/Three.js. Tham số bắt buộc: `--seed`, `--night 1|2|3`, `--ticks`, `--out`; tùy chọn `--scenario`, `--inputs`, `--snapshot-every` (mặc định10). File input/scenario sai trả2; lỗi CLI/output trả1; thành công0. JSONL: snapshot tick0, event (có night_start), snapshot định kỳ và end bắt buộc. Khi pause, tick tăng nhưng sim_tick không tăng. [Đặc tả/AC](docs/specs/phase-2.md) · [Bằng chứng Phase2](docs/proof/phase-2/README.md) · [Bằng chứng Phase1 ở tag phase-1](docs/proof/phase-1/README.md).

Browser test: `npm start`, rồi `node scripts/browser-check.mjs` (Chrome cài sẵn). Có thể đặt GAME_URL nếu dùng cổng khác, BROWSER_CHANNEL=msedge cho Edge. CI Ubuntu chạy build/verify mỗi push/PR; chỉ xác nhận CI khi GitHub đã chạy. Bằng chứng ghi cấu hình máy, thời gian, FPS và giới hạn; chưa chạy bộ test ẩn.

### Sáng tạo của tôi

Biển mây, sao, vòng ánh sáng an toàn, nhạc và hiệu ứng âm thanh tổng hợp gốc; camera mở mặt cắt tầng giữa khi nhân vật bị che bên dưới. Chúng thuộc lớp hiển thị/âm thanh, không thêm thực thể headless. [Ảnh Phase2](docs/proof/phase-2/night1.png) và [tất định/hiệu năng](docs/proof/phase-2/verification.json). Bản Phase1 vẫn nguyên tại tag phase-1.

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
